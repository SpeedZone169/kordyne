import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeDownloadUrl,
  loadOnshapeAccessToken,
} from "../../../../../lib/design-app/onshape-oauth";

type OnshapeContextInput = {
  documentId?: string | null;
  workspaceOrVersion?: string | null;
  workspaceOrVersionId?: string | null;
  workspaceId?: string | null;
  versionId?: string | null;
  elementId?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  configuration?: string | null;
};

type OnshapePart = {
  name?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  revision?: string | null;
  state?: string | null;
  description?: string | null;
  elementId?: string | null;
  microversionId?: string | null;
  bodyType?: string | null;
  isMesh?: boolean | null;
};

type OnshapeElement = {
  id?: string | null;
  name?: string | null;
  elementType?: string | null;
  microversionId?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWv(input: OnshapeContextInput) {
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
    elementId: asString(part.elementId) || null,
    microversionId: asString(part.microversionId) || null,
    bodyType: asString(part.bodyType) || null,
    isMesh: Boolean(part.isMesh),
  };
}

function normalizeElement(element: OnshapeElement) {
  return {
    id: asString(element.id) || null,
    name: asString(element.name) || null,
    elementType: asString(element.elementType) || null,
    microversionId: asString(element.microversionId) || null,
  };
}

function chooseActivePart(parts: ReturnType<typeof normalizePart>[], input: OnshapeContextInput) {
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

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json()) as OnshapeContextInput;
    const documentId = asString(input.documentId);
    const elementId = asString(input.elementId);
    const { wv, wvid } = normalizeWv(input);

    if (!documentId || !elementId || !wvid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onshape context lookup requires documentId, workspace/version id, and elementId.",
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
          error: "Connect Onshape API access before reading Onshape parts.",
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
    let normalizedElements: ReturnType<typeof normalizeElement>[] = [];

    try {
      const elements = await fetchOnshapeJson<OnshapeElement[]>(
        buildOnshapeDownloadUrl(
          `/documents/d/${documentId}/${wv}/${wvid}/elements`,
        ),
        storedToken.accessToken,
      );
      normalizedElements = Array.isArray(elements)
        ? elements.map(normalizeElement)
        : [];
    } catch {
      normalizedElements = [];
    }
    const activeElement =
      normalizedElements.find((element) => element.id === elementId) ?? null;

    return NextResponse.json({
      ok: true,
      active_part: activePart,
      active_element: activeElement,
      parts: normalizedParts,
      source: "onshape_parts_api",
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
