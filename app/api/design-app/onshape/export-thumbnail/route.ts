import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import {
  buildOnshapeApiUrl,
  getOnshapeOAuthConfig,
  loadOnshapeAccessToken,
} from "../../../../../lib/design-app/onshape-oauth";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

type ExportThumbnailInput = {
  documentId?: string | null;
  workspaceOrVersion?: string | null;
  workspaceOrVersionId?: string | null;
  workspaceId?: string | null;
  versionId?: string | null;
  elementId?: string | null;
  partNumber?: string | null;
  externalName?: string | null;
};

type ThumbnailCandidate = {
  href: string;
  score: number;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function normalizeWv(input: ExportThumbnailInput) {
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

function contentTypeToExtension(contentType: string) {
  const lower = contentType.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return ".jpg";
  if (lower.includes("webp")) return ".webp";
  return ".png";
}

function makeAbsoluteOnshapeUrl(href: string, cadBaseUrl: string) {
  if (/^https?:\/\//i.test(href)) return href;

  const base = cadBaseUrl.replace(/\/$/, "");
  if (href.startsWith("/")) return `${base}${href}`;

  return `${base}/${href}`;
}

function collectThumbnailCandidates(
  value: unknown,
  candidates: ThumbnailCandidate[],
) {
  if (!value) return;

  if (typeof value === "string") {
    if (value.includes("/thumbnail") || value.includes("/thumbnails")) {
      candidates.push({ href: value, score: 1 });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectThumbnailCandidates(item, candidates));
    return;
  }

  if (typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  const href = asString(record.href) || asString(record.url);

  if (
    href &&
    (href.includes("/thumbnail") ||
      href.includes("/thumbnails") ||
      asString(record.mimeType).startsWith("image/") ||
      asString(record.mediaType).startsWith("image/"))
  ) {
    const width =
      typeof record.width === "number"
        ? record.width
        : Number(asString(record.width)) || 0;
    const height =
      typeof record.height === "number"
        ? record.height
        : Number(asString(record.height)) || 0;
    const size = typeof record.size === "number" ? record.size : 0;
    candidates.push({ href, score: width * height || size || 1 });
  }

  Object.values(record).forEach((item) =>
    collectThumbnailCandidates(item, candidates),
  );
}

async function fetchJson<T>(url: string, accessToken: string) {
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
      payload.message ||
        payload.error ||
        `Onshape request failed (${response.status}).`,
    );
  }

  return payload;
}

async function fetchOptionalJson<T>(url: string, accessToken: string) {
  try {
    return await fetchJson<T>(url, accessToken);
  } catch {
    return null;
  }
}

async function fetchThumbnailBytes(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "image/png,image/jpeg,image/webp,*/*",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.toLowerCase().startsWith("image/")) return null;

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType,
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

    const input = (await request.json()) as ExportThumbnailInput;
    const documentId = asString(input.documentId);
    const elementId = asString(input.elementId);
    const { wv, wvid } = normalizeWv(input);

    if (!documentId || !elementId || !wvid) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onshape preview export requires documentId, workspace/version id, and elementId.",
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
          error: "Connect Onshape API access before exporting a preview.",
        },
        { status: 409 },
      );
    }

    const config = getOnshapeOAuthConfig(request.url);
    const candidates: ThumbnailCandidate[] = [];
    const thumbnailMetadataUrls = [
      buildOnshapeApiUrl(
        config,
        `/thumbnails/d/${documentId}/${wv}/${wvid}/e/${elementId}`,
      ),
      buildOnshapeApiUrl(config, `/thumbnails/d/${documentId}`),
      buildOnshapeApiUrl(config, `/documents/${documentId}`),
    ];

    for (const url of thumbnailMetadataUrls) {
      const payload = await fetchOptionalJson<Record<string, unknown>>(
        url,
        storedToken.accessToken,
      );
      collectThumbnailCandidates(payload, candidates);
    }

    let thumbnail = null as Awaited<ReturnType<typeof fetchThumbnailBytes>>;

    for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
      thumbnail = await fetchThumbnailBytes(
        makeAbsoluteOnshapeUrl(candidate.href, config.cadBaseUrl),
        storedToken.accessToken,
      );
      if (thumbnail) break;
    }

    if (!thumbnail) {
      const fallbackUrls = [
        buildOnshapeApiUrl(
          config,
          `/thumbnails/d/${documentId}/${wv}/${wvid}/e/${elementId}/s/300x300`,
        ),
        buildOnshapeApiUrl(
          config,
          `/thumbnails/d/${documentId}/${wv}/${wvid}/e/${elementId}/s/600x600`,
        ),
      ];

      for (const url of fallbackUrls) {
        thumbnail = await fetchThumbnailBytes(url, storedToken.accessToken);
        if (thumbnail) break;
      }
    }

    if (!thumbnail?.bytes.byteLength) {
      return NextResponse.json(
        { ok: false, error: "Onshape did not return a preview thumbnail." },
        { status: 502 },
      );
    }

    const baseName =
      asString(input.partNumber) || asString(input.externalName) || "onshape-preview";
    const extension = contentTypeToExtension(thumbnail.contentType);
    const filename = sanitizeFileName(
      `${baseName.replace(/\.[^.]+$/i, "")}-preview${extension}`,
    );
    const storagePath = [
      "design-app",
      ctx.organizationId,
      ctx.user.id,
      `${Date.now()}-thumbnail-${filename}`,
    ].join("/");

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, thumbnail.bytes, {
        contentType: thumbnail.contentType,
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
        mime_type: thumbnail.contentType,
        size_bytes: thumbnail.bytes.byteLength,
        storage_path: storagePath,
        role: "thumbnail",
        file_extension: extension,
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
        onshape_credential_profile_id: storedToken.profileId,
      },
      message: "Onshape preview thumbnail attached.",
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
