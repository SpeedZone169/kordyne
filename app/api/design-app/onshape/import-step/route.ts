import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeApiUrl,
  getOnshapeOAuthConfig,
  loadOnshapeAccessToken,
  type OnshapeOAuthConfig,
} from "../../../../../lib/design-app/onshape-oauth";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

type ImportStepInput = {
  part_id?: string | null;
  file_id?: string | null;
  storage_path?: string | null;
  filename?: string | null;
  import_name?: string | null;
  mime_type?: string | null;
  mode?: "new_document" | "current_document" | null;
  documentId?: string | null;
  workspaceId?: string | null;
  workspaceOrVersion?: string | null;
  workspaceOrVersionId?: string | null;
};

type PartFileRow = {
  id: string;
  file_name: string | null;
  file_type: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  created_at: string | null;
};

type PartRow = {
  id: string;
  organization_id: string;
  part_family_id: string | null;
  name: string | null;
  revision: string | null;
  status: string | null;
};

type OnshapeDocumentResponse = {
  id?: string | null;
  name?: string | null;
  href?: string | null;
  workspaceId?: string | null;
  defaultWorkspaceId?: string | null;
  defaultWorkspace?: {
    id?: string | null;
    workspaceId?: string | null;
  } | null;
};

type TranslationResponse = {
  id?: string | null;
  requestState?: string | null;
  requestElementId?: string | null;
  resultElementIds?: string[] | null;
  resultDocumentId?: string | null;
  resultWorkspaceId?: string | null;
  documentId?: string | null;
  workspaceId?: string | null;
  name?: string | null;
  failureReason?: string | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isStepFile(fileName: unknown) {
  const lower = String(fileName ?? "").toLowerCase();
  return lower.endsWith(".step") || lower.endsWith(".stp");
}

function validateStoragePathPrefix(
  storagePath: string,
  organizationId: string,
  userId: string,
) {
  const expectedPrefix = `design-app/${organizationId}/${userId}/`;
  return storagePath.startsWith(expectedPrefix);
}

function safeDocumentName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
}

function safeStepImportFilename(value: string, fallback: string) {
  const fallbackBase =
    safeDocumentName(fallback.replace(/\.(step|stp)$/i, "")) || "Kordyne part";
  const base =
    safeDocumentName(value.replace(/\.(step|stp)$/i, "")) || fallbackBase;
  return `${base.slice(0, 90)}.step`;
}

function parseJsonObject<T>(text: string): T & { message?: string; error?: string } {
  try {
    const parsed = JSON.parse(text);

    if (parsed && typeof parsed === "object") {
      return parsed as T & { message?: string; error?: string };
    }
  } catch {
    // Fall through to empty object below.
  }

  return {} as T & { message?: string; error?: string };
}

function isStoredCredentialDecryptionError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("Unsupported state or unable to authenticate data") ||
    message.includes("Missing KORDYNE_CONNECTOR_ENCRYPTION_KEY") ||
    message.includes("Invalid KORDYNE_CONNECTOR_ENCRYPTION_KEY")
  );
}

function buildVersionedOnshapeApiUrl(
  config: OnshapeOAuthConfig,
  version: string,
  path: string,
) {
  return `${config.cadBaseUrl.replace(/\/$/, "")}/api/${version.replace(
    /^\/+/,
    "",
  )}${path.startsWith("/") ? path : `/${path}`}`;
}

function defaultWorkspaceId(document: OnshapeDocumentResponse) {
  return (
    asString(document.defaultWorkspaceId) ||
    asString(document.workspaceId) ||
    asString(document.defaultWorkspace?.id) ||
    asString(document.defaultWorkspace?.workspaceId)
  );
}

function onshapeDocumentUrl(
  config: OnshapeOAuthConfig,
  documentId: string,
  workspaceId: string,
  elementId?: string | null,
) {
  const base = config.cadBaseUrl.replace(/\/$/, "");
  const element = asString(elementId);

  return element
    ? `${base}/documents/${documentId}/w/${workspaceId}/e/${element}`
    : `${base}/documents/${documentId}/w/${workspaceId}`;
}

async function fetchOnshapeJson<T>(
  url: string,
  accessToken: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json;charset=UTF-8; qs=0.09");
  headers.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });
  const text = await response.text();
  const payload = parseJsonObject<T>(text);

  if (!response.ok) {
    throw new Error(
      payload.message ||
        payload.error ||
        text ||
        `Onshape request failed (${response.status}).`,
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
  let latest: TranslationResponse | null = null;

  for (let index = 0; index < delays.length; index += 1) {
    if (index > 0) await sleep(delays[index]);

    latest = await fetchOnshapeJson<TranslationResponse>(
      buildOnshapeApiUrl(config, `/translations/${translationId}`),
      accessToken,
    );

    if (latest.requestState === "DONE") return latest;

    if (latest.requestState === "FAILED") {
      throw new Error(latest.failureReason || "Onshape STEP import failed.");
    }
  }

  throw new Error(
    latest?.requestState
      ? `Onshape STEP import is still ${latest.requestState.toLowerCase()}. Try again in a moment.`
      : "Onshape STEP import timed out.",
  );
}

async function createOnshapeDocument(
  config: OnshapeOAuthConfig,
  accessToken: string,
  name: string,
) {
  const created = await fetchOnshapeJson<OnshapeDocumentResponse>(
    buildVersionedOnshapeApiUrl(config, "v10", "/documents"),
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=UTF-8; qs=0.09",
      },
      body: JSON.stringify({ name }),
    },
  );
  const documentId = asString(created.id);

  if (!documentId) {
    throw new Error("Onshape did not return the created document id.");
  }

  let workspaceId = defaultWorkspaceId(created);

  if (!workspaceId) {
    const fetched = await fetchOnshapeJson<OnshapeDocumentResponse>(
      buildVersionedOnshapeApiUrl(config, "v10", `/documents/${documentId}`),
      accessToken,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json;charset=UTF-8; qs=0.09",
        },
      },
    );
    workspaceId = defaultWorkspaceId(fetched);
  }

  if (!workspaceId) {
    throw new Error("Onshape did not return a writable workspace for the new document.");
  }

  return { documentId, workspaceId };
}

async function importStepIntoDocument(input: {
  config: OnshapeOAuthConfig;
  accessToken: string;
  requestUrl: string;
  documentId: string;
  workspaceId: string;
  filename: string;
  importFilename?: string;
  contentType: string;
  bytes: Uint8Array;
}) {
  const form = new FormData();
  form.set("formatName", "");
  form.set("flattenAssemblies", "true");
  form.set("translate", "true");
  form.set("storeInDocument", "true");

  const fileBuffer = new ArrayBuffer(input.bytes.byteLength);
  new Uint8Array(fileBuffer).set(input.bytes);
  form.set(
    "file",
    new Blob([fileBuffer], { type: input.contentType }),
    input.importFilename || input.filename,
  );

  const translation = await fetchOnshapeJson<TranslationResponse>(
    buildOnshapeApiUrl(
      input.config,
      `/translations/d/${input.documentId}/w/${input.workspaceId}`,
    ),
    input.accessToken,
    {
      method: "POST",
      body: form,
    },
  );
  const translationId = asString(translation.id);

  if (!translationId) {
    throw new Error("Onshape did not return a translation id.");
  }

  const completed =
    translation.requestState === "DONE"
      ? translation
      : await pollTranslation(translationId, input.accessToken, input.requestUrl);
  const resultDocumentId =
    asString(completed.resultDocumentId) ||
    asString(completed.documentId) ||
    input.documentId;
  const resultWorkspaceId =
    asString(completed.resultWorkspaceId) ||
    asString(completed.workspaceId) ||
    input.workspaceId;
  const resultElementId =
    asString(completed.resultElementIds?.[0]) ||
    asString(completed.requestElementId);

  return {
    translationId,
    resultDocumentId,
    resultWorkspaceId,
    resultElementId: resultElementId || null,
    openUrl: onshapeDocumentUrl(
      input.config,
      resultDocumentId,
      resultWorkspaceId,
      resultElementId,
    ),
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json().catch(() => ({}))) as ImportStepInput;
    const partId = asString(input.part_id);
    const fileId = asString(input.file_id);
    const uploadStoragePath = asString(input.storage_path);

    if (!partId && !uploadStoragePath) {
      return NextResponse.json(
        { ok: false, error: "part_id or storage_path is required." },
        { status: 400 },
      );
    }

    const admin = createDesignAppAdminClient();
    let part: PartRow | null = null;
    let stepFile: PartFileRow | null = null;

    if (partId) {
      const { data: partRow, error: partError } = await ctx.supabase
        .from("parts")
        .select("id, organization_id, part_family_id, name, revision, status")
        .eq("id", partId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (partError) {
        return NextResponse.json(
          { ok: false, error: partError.message },
          { status: 500 },
        );
      }

      if (!partRow?.id) {
        return NextResponse.json(
          { ok: false, error: "Part not found." },
          { status: 404 },
        );
      }

      part = partRow as PartRow;

      let fileQuery = ctx.supabase
        .from("part_files")
        .select("id, part_id, file_name, file_type, storage_path, file_size_bytes, created_at")
        .eq("part_id", part.id)
        .order("created_at", { ascending: false });

      if (fileId) {
        fileQuery = fileQuery.eq("id", fileId);
      }

      const { data: files, error: filesError } = await fileQuery;

      if (filesError) {
        return NextResponse.json(
          { ok: false, error: filesError.message },
          { status: 500 },
        );
      }

      stepFile =
        ((files ?? []) as PartFileRow[]).find((file) =>
          isStepFile(file.file_name),
        ) ?? null;
    } else {
      if (
        !validateStoragePathPrefix(
          uploadStoragePath,
          ctx.organizationId,
          ctx.user.id,
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Uploaded STEP path is outside the allowed design-app scope.",
          },
          { status: 403 },
        );
      }

      const filename = asString(input.filename) || uploadStoragePath.split("/").pop() || "kordyne-current.step";

      if (!isStepFile(filename)) {
        return NextResponse.json(
          { ok: false, error: "Uploaded comparison file must be STEP/STP." },
          { status: 400 },
        );
      }

      stepFile = {
        id: "",
        file_name: filename,
        file_type: asString(input.mime_type) || "application/step",
        storage_path: uploadStoragePath,
        file_size_bytes: null,
        created_at: new Date().toISOString(),
      };
    }

    if (!stepFile?.storage_path) {
      return NextResponse.json(
        { ok: false, error: "No STEP file is available for import." },
        { status: 404 },
      );
    }

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
          error: "Connect Onshape API access before importing STEP into Onshape.",
        },
        { status: 409 },
      );
    }

    const { data: blob, error: downloadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .download(stepFile.storage_path);

    if (downloadError || !blob) {
      return NextResponse.json(
        {
          ok: false,
          error: downloadError?.message ?? "Could not download STEP from Kordyne storage.",
        },
        { status: 500 },
      );
    }

    const filename = asString(stepFile.file_name) || "kordyne-part.step";
    const importFilename = safeStepImportFilename(
      asString(input.import_name) ||
        part?.name ||
        filename.replace(/\.(step|stp)$/i, ""),
      filename,
    );
    const contentType =
      blob.type || asString(stepFile.file_type) || "application/step";
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const config = getOnshapeOAuthConfig(request.url);
    const mode = input.mode === "current_document" ? "current_document" : "new_document";
    let documentId = "";
    let workspaceId = "";

    if (mode === "current_document") {
      documentId = asString(input.documentId);
      workspaceId =
        asString(input.workspaceId) ||
        (asString(input.workspaceOrVersion).toLowerCase() === "w"
          ? asString(input.workspaceOrVersionId)
          : "");

      if (!documentId || !workspaceId) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "STEP compare import requires the active Onshape document and editable workspace.",
          },
          { status: 400 },
        );
      }
    } else {
      const baseName =
        safeDocumentName(
          `${part?.name || filename.replace(/\.(step|stp)$/i, "")} Rev ${
            part?.revision || "latest"
          }`,
        ) || "Kordyne Onshape pull";
      const created = await createOnshapeDocument(
        config,
        storedToken.accessToken,
        baseName,
      );
      documentId = created.documentId;
      workspaceId = created.workspaceId;
    }

    const imported = await importStepIntoDocument({
      config,
      accessToken: storedToken.accessToken,
      requestUrl: request.url,
      documentId,
      workspaceId,
      filename,
      importFilename,
      contentType,
      bytes,
    });

    return NextResponse.json({
      ok: true,
      mode,
      part: {
        id: part?.id ?? "onshape-current-source",
        name: part?.name ?? asString(input.filename) ?? "Current Onshape source",
        revision: part?.revision ?? null,
        status: part?.status ?? null,
        part_family_id: part?.part_family_id ?? null,
      },
      file: {
        id: stepFile.id || null,
        filename,
        size_bytes: stepFile.file_size_bytes ?? null,
      },
      onshape: {
        document_id: imported.resultDocumentId,
        workspace_id: imported.resultWorkspaceId,
        element_id: imported.resultElementId,
        translation_id: imported.translationId,
        open_url: imported.openUrl,
      },
      message:
        mode === "current_document"
          ? "Latest STEP imported into the active Onshape document."
          : "STEP imported into a new Onshape document.",
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
