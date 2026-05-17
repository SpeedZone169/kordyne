import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeApiUrl,
  buildOnshapeDownloadUrl,
  getOnshapeOAuthConfig,
  loadOnshapeAccessToken,
} from "../../../../../lib/design-app/onshape-oauth";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

type ExportStepInput = {
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

type TranslationStartResponse = {
  id?: string;
  href?: string;
  requestState?: string;
  resultExternalDataIds?: string[] | null;
  resultElementIds?: string[] | null;
  failureReason?: string | null;
  documentId?: string | null;
  workspaceId?: string | null;
  resultDocumentId?: string | null;
  resultWorkspaceId?: string | null;
  name?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeWv(input: ExportStepInput) {
  const workspaceOrVersion =
    asString(input.workspaceOrVersion).toLowerCase() ||
    (asString(input.versionId) ? "v" : "w");
  const wv = workspaceOrVersion === "v" ? "v" : "w";
  const wvid =
    asString(input.workspaceOrVersionId) ||
    (wv === "v" ? asString(input.versionId) : asString(input.workspaceId));

  return { wv, wvid };
}

function parseFilenameFromDisposition(disposition: string | null) {
  if (!disposition) return "";

  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].replace(/"/g, ""));

  const ascii = disposition.match(/filename="?([^";]+)"?/i);
  return ascii?.[1] ? ascii[1].trim() : "";
}

function isStoredCredentialDecryptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Unsupported state or unable to authenticate data") ||
    message.includes("Missing KORDYNE_CONNECTOR_ENCRYPTION_KEY") ||
    message.includes("Invalid KORDYNE_CONNECTOR_ENCRYPTION_KEY")
  );
}

async function fetchJson<T>(
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
      payload.message || payload.error || `Onshape request failed (${response.status}).`,
    );
  }

  return payload;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollTranslation(
  translationId: string,
  accessToken: string,
  requestUrl: string,
) {
  const config = getOnshapeOAuthConfig(requestUrl);
  const delays = [1000, 1500, 2500, 4000, 6000, 8000, 10000, 12000];
  let latest: TranslationStartResponse | null = null;

  for (let index = 0; index < delays.length; index += 1) {
    if (index > 0) await sleep(delays[index]);

    latest = await fetchJson<TranslationStartResponse>(
      buildOnshapeApiUrl(config, `/translations/${translationId}`),
      accessToken,
    );

    if (latest.requestState === "DONE") return latest;

    if (latest.requestState === "FAILED") {
      throw new Error(latest.failureReason || "Onshape STEP export failed.");
    }
  }

  throw new Error(
    latest?.requestState
      ? `Onshape STEP export is still ${latest.requestState.toLowerCase()}. Try again in a moment.`
      : "Onshape STEP export timed out.",
  );
}

async function downloadTranslationResult(
  translation: TranslationStartResponse,
  input: ExportStepInput,
  accessToken: string,
) {
  const externalDataId = translation.resultExternalDataIds?.[0];

  if (externalDataId) {
    return fetch(buildOnshapeDownloadUrl(`/documents/d/${input.documentId}/externaldata/${externalDataId}`), {
      headers: {
        Accept: "application/octet-stream",
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  const resultElementId = translation.resultElementIds?.[0];
  const { wv, wvid } = normalizeWv(input);

  if (resultElementId) {
    return fetch(
      buildOnshapeDownloadUrl(
        `/blobelements/d/${translation.resultDocumentId || input.documentId}/${wv}/${translation.resultWorkspaceId || wvid}/e/${resultElementId}`,
      ),
      {
        headers: {
          Accept: "application/octet-stream",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
  }

  throw new Error("Onshape did not return a downloadable STEP result.");
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json()) as ExportStepInput;
    const documentId = asString(input.documentId);
    const elementId = asString(input.elementId);
    const { wv, wvid } = normalizeWv(input);

    if (!documentId || !elementId || !wvid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onshape STEP export requires documentId, workspace/version id, and elementId.",
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
          error: "Connect Onshape API access before exporting STEP.",
        },
        { status: 409 },
      );
    }

    const config = getOnshapeOAuthConfig(request.url);
    const query = new URLSearchParams();
    const configuration = asString(input.configuration);
    if (configuration) query.set("configuration", configuration);

    const translationUrl = buildOnshapeApiUrl(
      config,
      `/partstudios/d/${documentId}/${wv}/${wvid}/e/${elementId}/translations${
        query.size ? `?${query.toString()}` : ""
      }`,
    );

    const translation = await fetchJson<TranslationStartResponse>(
      translationUrl,
      storedToken.accessToken,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8; qs=0.09",
        },
        body: JSON.stringify({
          formatName: "STEP",
          storeInDocument: false,
          translate: true,
          ...(asString(input.partId) ? { partIds: asString(input.partId) } : {}),
        }),
      },
    );

    const translationId = translation.id;

    if (!translationId) {
      throw new Error("Onshape did not return a translation id.");
    }

    const completed =
      translation.requestState === "DONE"
        ? translation
        : await pollTranslation(translationId, storedToken.accessToken, request.url);

    const downloadResponse = await downloadTranslationResult(
      completed,
      { ...input, documentId, elementId, workspaceOrVersion: wv, workspaceOrVersionId: wvid },
      storedToken.accessToken,
    );

    if (!downloadResponse.ok) {
      throw new Error(
        `Onshape STEP download failed (${downloadResponse.status}).`,
      );
    }

    const bytes = new Uint8Array(await downloadResponse.arrayBuffer());
    const disposition = downloadResponse.headers.get("content-disposition");
    const responseFilename = parseFilenameFromDisposition(disposition);
    const baseName =
      asString(input.partNumber) ||
      asString(input.externalName) ||
      completed.name ||
      "onshape-export";
    const filename = sanitizeFileName(
      responseFilename || `${baseName.replace(/\.(step|stp)$/i, "")}.step`,
    );
    const storagePath = [
      "design-app",
      ctx.organizationId,
      ctx.user.id,
      `${Date.now()}-step-${filename}`,
    ].join("/");
    const contentType =
      downloadResponse.headers.get("content-type") || "application/step";

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, bytes, {
        contentType,
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
        mime_type: contentType,
        size_bytes: bytes.byteLength,
        storage_path: storagePath,
        role: "step",
        file_extension: filename.toLowerCase().endsWith(".stp") ? ".stp" : ".step",
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
        onshape_translation_id: translationId,
        onshape_credential_profile_id: storedToken.profileId,
      },
      message: "Onshape STEP export attached.",
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
