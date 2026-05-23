import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeDownloadUrl,
  loadOnshapeAccessToken,
} from "../../../../../lib/design-app/onshape-oauth";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

type ExportPropertiesInput = {
  documentId?: string | null;
  workspaceOrVersion?: string | null;
  workspaceOrVersionId?: string | null;
  workspaceId?: string | null;
  versionId?: string | null;
  elementId?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  configuration?: string | null;
  externalName?: string | null;
};

type OnshapePart = {
  name?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  revision?: string | null;
  state?: string | null;
  description?: string | null;
  bodyType?: string | null;
  isMesh?: boolean | null;
  material?: {
    displayName?: string | null;
    name?: string | null;
    id?: string | null;
  } | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeWv(input: ExportPropertiesInput) {
  const workspaceOrVersion =
    asString(input.workspaceOrVersion).toLowerCase() ||
    (asString(input.versionId) ? "v" : "w");
  const wv = workspaceOrVersion === "v" ? "v" : "w";
  const wvid =
    asString(input.workspaceOrVersionId) ||
    (wv === "v" ? asString(input.versionId) : asString(input.workspaceId));

  return { wv, wvid };
}

function isStoredCredentialDecryptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Unsupported state or unable to authenticate data") ||
    message.includes("Missing KORDYNE_CONNECTOR_ENCRYPTION_KEY") ||
    message.includes("Invalid KORDYNE_CONNECTOR_ENCRYPTION_KEY")
  );
}

function normalizePart(part: OnshapePart) {
  return {
    name: asString(part.name) || null,
    partId: asString(part.partId) || null,
    partNumber: asString(part.partNumber) || null,
    revision: asString(part.revision) || null,
    state: asString(part.state) || null,
    description: asString(part.description) || null,
    bodyType: asString(part.bodyType) || null,
    isMesh: Boolean(part.isMesh),
    material:
      asString(part.material?.displayName) ||
      asString(part.material?.name) ||
      asString(part.material?.id) ||
      null,
  };
}

function chooseActivePart(parts: ReturnType<typeof normalizePart>[], input: ExportPropertiesInput) {
  const partId = asString(input.partId);
  const partNumber = asString(input.partNumber).toLowerCase();

  return (
    (partId ? parts.find((part) => part.partId === partId) : null) ||
    (partNumber
      ? parts.find((part) => (part.partNumber ?? "").toLowerCase() === partNumber)
      : null) ||
    parts.find((part) => part.bodyType === "solid" && !part.isMesh) ||
    parts[0] ||
    null
  );
}

function findNumericValue(value: unknown, keyHint: string): number | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const next = findNumericValue(item, keyHint);
      if (next !== null) return next;
    }
    return null;
  }

  const record = value as Record<string, unknown>;

  for (const [key, item] of Object.entries(record)) {
    if (key.toLowerCase().includes(keyHint.toLowerCase())) {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (Array.isArray(item)) {
        const firstNumber = item.find(
          (entry) => typeof entry === "number" && Number.isFinite(entry),
        );
        if (typeof firstNumber === "number") return firstNumber;
      }
      const nested = findNumericValue(item, keyHint);
      if (nested !== null) return nested;
    }
  }

  for (const item of Object.values(record)) {
    const nested = findNumericValue(item, keyHint);
    if (nested !== null) return nested;
  }

  return null;
}

async function fetchOnshapeJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json;charset=UTF-8; qs=0.09",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.message || payload.error || `Onshape request failed (${response.status}).`,
    );
  }

  return payload;
}

function propertiesText(input: {
  activePart: ReturnType<typeof normalizePart> | null;
  documentId: string;
  elementId: string;
  wv: string;
  wvid: string;
  massProperties: Record<string, unknown> | null;
}) {
  const mass = findNumericValue(input.massProperties, "mass");
  const volume = findNumericValue(input.massProperties, "volume");
  const density =
    findNumericValue(input.massProperties, "density") ||
    (mass && volume ? mass / volume : null);

  const lines = [
    "Kordyne Onshape part properties",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Onshape source",
    `Document ID: ${input.documentId}`,
    `Element ID: ${input.elementId}`,
    `Workspace/version: ${input.wv}/${input.wvid}`,
    "",
    "Part",
    `Name: ${input.activePart?.name ?? "-"}`,
    `Part number: ${input.activePart?.partNumber ?? "-"}`,
    `Revision: ${input.activePart?.revision ?? "-"}`,
    `Onshape part ID: ${input.activePart?.partId ?? "-"}`,
    `Material: ${input.activePart?.material ?? "-"}`,
    "",
    "Mass properties",
    `Mass / weight basis: ${mass === null ? "-" : `${mass} kg`}`,
    `Volume: ${volume === null ? "-" : `${volume} m^3`}`,
    `Density: ${density === null ? "-" : `${density} kg/m^3`}`,
    "",
    "Raw Onshape mass properties",
    JSON.stringify(input.massProperties ?? {}, null, 2),
  ];

  return lines.join("\n");
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json()) as ExportPropertiesInput;
    const documentId = asString(input.documentId);
    const elementId = asString(input.elementId);
    const { wv, wvid } = normalizeWv(input);

    if (!documentId || !elementId || !wvid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onshape property export requires documentId, workspace/version id, and elementId.",
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
          error: "Connect Onshape API access before exporting properties.",
        },
        { status: 409 },
      );
    }

    const query = new URLSearchParams({
      elementId,
      withThumbnails: "false",
      includePropertyDefaults: "false",
    });
    const configuration = asString(input.configuration);
    if (configuration) query.set("configuration", configuration);

    const parts = await fetchOnshapeJson<OnshapePart[]>(
      buildOnshapeDownloadUrl(
        `/parts/d/${documentId}/${wv}/${wvid}?${query.toString()}`,
      ),
      storedToken.accessToken,
    );
    const normalizedParts = Array.isArray(parts) ? parts.map(normalizePart) : [];
    const activePart = chooseActivePart(normalizedParts, input);
    let massProperties: Record<string, unknown> | null = null;

    if (activePart?.partId) {
      massProperties = await fetchOnshapeJson<Record<string, unknown>>(
        buildOnshapeDownloadUrl(
          `/parts/d/${documentId}/${wv}/${wvid}/e/${elementId}/partid/${activePart.partId}/massproperties`,
        ),
        storedToken.accessToken,
      );
    }

    const text = propertiesText({
      activePart,
      documentId,
      elementId,
      wv,
      wvid,
      massProperties,
    });
    const baseName =
      asString(input.partNumber) ||
      asString(input.externalName) ||
      activePart?.name ||
      "onshape-properties";
    const filename = sanitizeFileName(
      `${baseName.replace(/\.[^.]+$/i, "")}-properties.txt`,
    );
    const bytes = new TextEncoder().encode(text);
    const storagePath = [
      "design-app",
      ctx.organizationId,
      ctx.user.id,
      `${Date.now()}-properties-${filename}`,
    ].join("/");

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, bytes, {
        contentType: "text/plain; charset=utf-8",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      file: {
        filename,
        mime_type: "text/plain; charset=utf-8",
        size_bytes: bytes.byteLength,
        storage_path: storagePath,
        role: "properties",
        file_extension: ".txt",
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
        onshape_credential_profile_id: storedToken.profileId,
      },
      properties: {
        active_part: activePart,
        mass: findNumericValue(massProperties, "mass"),
        volume: findNumericValue(massProperties, "volume"),
        density: findNumericValue(massProperties, "density"),
      },
      message: "Onshape properties text file attached.",
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
