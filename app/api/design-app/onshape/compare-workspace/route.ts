import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeApiUrl,
  getOnshapeOAuthConfig,
  loadOnshapeAccessToken,
} from "../../../../../lib/design-app/onshape-oauth";

type CompareImport = {
  label?: string | null;
  documentId?: string | null;
  workspaceId?: string | null;
  elementId?: string | null;
  configuration?: string | null;
  name?: string | null;
  revision?: string | null;
  material?: string | null;
  process_type?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
};

type CompareWorkspaceInput = {
  documentId?: string | null;
  workspaceId?: string | null;
  imports?: CompareImport[] | null;
};

type OnshapePart = {
  name?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  revision?: string | null;
  description?: string | null;
  bodyType?: string | null;
  isMesh?: boolean | null;
  material?: {
    displayName?: string | null;
    name?: string | null;
  } | null;
};

type OnshapeAssemblyResponse = {
  id?: string | null;
  elementId?: string | null;
  href?: string | null;
  name?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function choosePrimaryPart(parts: OnshapePart[]) {
  return (
    parts.find((part) => part.bodyType === "solid" && !part.isMesh) ||
    parts.find((part) => !part.isMesh) ||
    parts[0] ||
    null
  );
}

function firstNumber(value: unknown, preferredKey?: string): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const number = firstNumber(item, preferredKey);
      if (number !== null) return number;
    }
    return null;
  }

  const record = value as Record<string, unknown>;

  if (preferredKey && preferredKey in record) {
    const direct = firstNumber(record[preferredKey], preferredKey);
    if (direct !== null) return direct;
  }

  for (const [key, item] of Object.entries(record)) {
    if (preferredKey && key.toLowerCase() !== preferredKey.toLowerCase()) {
      continue;
    }

    const number = firstNumber(item, preferredKey);
    if (number !== null) return number;
  }

  if (preferredKey) return null;

  for (const item of Object.values(record)) {
    const number = firstNumber(item);
    if (number !== null) return number;
  }

  return null;
}

function onshapeDocumentUrl(
  cadBaseUrl: string,
  documentId: string,
  workspaceId: string,
  elementId?: string | null,
) {
  const base = cadBaseUrl.replace(/\/$/, "");
  const element = asString(elementId);

  return element
    ? `${base}/documents/${documentId}/w/${workspaceId}/e/${element}`
    : `${base}/documents/${documentId}/w/${workspaceId}`;
}

function isStoredCredentialDecryptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Unsupported state or unable to authenticate data") ||
    message.includes("Missing KORDYNE_CONNECTOR_ENCRYPTION_KEY") ||
    message.includes("Invalid KORDYNE_CONNECTOR_ENCRYPTION_KEY")
  );
}

async function fetchOnshapeJson<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {},
) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json;charset=UTF-8; qs=0.09",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        `Onshape request failed (${response.status}).`,
    );
  }

  return payload;
}

async function fetchOptionalOnshapeJson<T>(url: string, accessToken: string) {
  try {
    return await fetchOnshapeJson<T>(url, accessToken);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json().catch(() => ({}))) as CompareWorkspaceInput;
    const documentId = asString(input.documentId);
    const workspaceId = asString(input.workspaceId);
    const imports = (input.imports ?? []).slice(0, 2);

    if (!documentId || !workspaceId || imports.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Compare workspace requires an active Onshape document, workspace, and two imported parts.",
        },
        { status: 400 },
      );
    }

    const admin = createDesignAppAdminClient();
    let storedToken;

    try {
      storedToken = await loadOnshapeAccessToken(
        admin,
        ctx.organizationId,
        request.url,
      );
    } catch (error) {
      if (isStoredCredentialDecryptionError(error)) {
        return NextResponse.json(
          {
            ok: false,
            needs_onshape_oauth: true,
            error:
              "Reconnect Onshape API access. The saved Onshape token can no longer be decrypted after the security key change.",
          },
          { status: 409 },
        );
      }

      throw error;
    }

    if (!storedToken) {
      return NextResponse.json(
        {
          ok: false,
          needs_onshape_oauth: true,
          error: "Connect Onshape API access before creating an Onshape compare workspace.",
        },
        { status: 409 },
      );
    }

    const config = getOnshapeOAuthConfig(request.url);
    const warnings: string[] = [];
    const resolved = [];

    for (const item of imports) {
      const itemDocumentId = asString(item.documentId) || documentId;
      const itemWorkspaceId = asString(item.workspaceId) || workspaceId;
      const itemElementId = asString(item.elementId);

      if (!itemElementId) {
        warnings.push(`${asString(item.label) || "Compare item"} has no Onshape element id.`);
        continue;
      }

      let primaryPart: OnshapePart | null = null;

      try {
        const parts = await fetchOnshapeJson<OnshapePart[]>(
          buildOnshapeApiUrl(
            config,
            `/parts/d/${itemDocumentId}/w/${itemWorkspaceId}/e/${itemElementId}?withThumbnails=false&includePropertyDefaults=false`,
          ),
          storedToken.accessToken,
        );
        primaryPart = choosePrimaryPart(Array.isArray(parts) ? parts : []);
      } catch (error) {
        warnings.push(
          `${asString(item.label) || "Compare item"} part lookup failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }

      let volumeM3: number | null = null;

      if (primaryPart?.partId) {
        const massProperties = await fetchOptionalOnshapeJson<Record<string, unknown>>(
          buildOnshapeApiUrl(
            config,
            `/parts/d/${itemDocumentId}/w/${itemWorkspaceId}/e/${itemElementId}/partid/${primaryPart.partId}/massproperties`,
          ),
          storedToken.accessToken,
        );
        volumeM3 = firstNumber(massProperties, "volume");
      }

      resolved.push({
        input: item,
        documentId: itemDocumentId,
        workspaceId: itemWorkspaceId,
        elementId: itemElementId,
        part: primaryPart,
        row: {
          label: asString(item.label) || "Compare item",
          name: asString(item.name) || asString(primaryPart?.name) || null,
          revision: asString(item.revision) || asString(primaryPart?.revision) || null,
          material:
            asString(item.material) ||
            asString(primaryPart?.material?.displayName) ||
            asString(primaryPart?.material?.name) ||
            null,
          process_type: asString(item.process_type) || null,
          file_name: asString(item.file_name) || null,
          file_size_bytes:
            typeof item.file_size_bytes === "number" ? item.file_size_bytes : null,
          onshape_element_id: itemElementId,
          onshape_part_id: asString(primaryPart?.partId) || null,
          volume_m3: volumeM3,
        },
      });
    }

    const assemblyName = `Kordyne compare ${new Date()
      .toISOString()
      .slice(0, 16)
      .replace("T", " ")}`;
    let assembly: {
      element_id?: string | null;
      open_url?: string | null;
      inserted_count?: number;
      warnings?: string[];
    } | null = null;

    try {
      const created = await fetchOnshapeJson<OnshapeAssemblyResponse>(
        buildOnshapeApiUrl(config, `/assemblies/d/${documentId}/w/${workspaceId}`),
        storedToken.accessToken,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8; qs=0.09",
          },
          body: JSON.stringify({ name: assemblyName }),
        },
      );
      const assemblyElementId =
        asString(created.id) || asString(created.elementId);

      if (!assemblyElementId) {
        throw new Error("Onshape did not return the comparison assembly tab id.");
      }

      let insertedCount = 0;

      for (const item of resolved) {
        const partId = asString(item.part?.partId);
        if (!partId) {
          warnings.push(`${item.row.label} has no insertable part id.`);
          continue;
        }

        try {
          await fetchOnshapeJson<Record<string, unknown>>(
            buildOnshapeApiUrl(
              config,
              `/assemblies/d/${documentId}/w/${workspaceId}/e/${assemblyElementId}/instances`,
            ),
            storedToken.accessToken,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json;charset=UTF-8; qs=0.09",
              },
              body: JSON.stringify({
                documentId: item.documentId,
                elementId: item.elementId,
                partId,
                includePartTypes: ["PARTS"],
              }),
            },
          );
          insertedCount += 1;
        } catch (error) {
          warnings.push(
            `${item.row.label} could not be inserted into the assembly: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          );
        }
      }

      assembly = {
        element_id: assemblyElementId,
        open_url: onshapeDocumentUrl(
          config.cadBaseUrl,
          documentId,
          workspaceId,
          assemblyElementId,
        ),
        inserted_count: insertedCount,
        warnings,
      };
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? error.message
          : "Onshape comparison assembly could not be created.",
      );
    }

    return NextResponse.json({
      ok: true,
      assembly,
      rows: resolved.map((item) => item.row),
      message: assembly?.inserted_count
        ? "Comparison assembly created."
        : "Comparison tabs are ready. Assembly creation was skipped or unavailable.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
