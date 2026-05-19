import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type ApsDerivativeStatus =
  | "queued"
  | "uploaded"
  | "translating"
  | "ready"
  | "failed";

export type ApsDerivativeRow = {
  id: string;
  organization_id: string;
  part_file_id: string | null;
  provider_package_file_id: string | null;
  source_type: "part_file" | "provider_package_file";
  source_file_name: string | null;
  source_storage_path: string | null;
  aps_object_key: string | null;
  aps_object_id: string | null;
  aps_urn: string | null;
  status: ApsDerivativeStatus;
  progress: string | null;
  manifest_json: unknown | null;
  last_error: string | null;
  requested_by: string | null;
  created_at: string;
  updated_at: string;
  last_prepared_at: string | null;
  last_translated_at: string | null;
};

type QuotaRow = {
  allowed: boolean;
  quota: number;
  used: number;
  remaining: number;
  month_start: string;
};

type LegacyDerivativeSource = {
  organizationId: string;
  requestedBy: string;
  sourceType: "part_file" | "provider_package_file";
  partFileId?: string | null;
  providerPackageFileId?: string | null;
  fileName: string | null;
  storagePath: string | null;
  objectKey: string | null;
  objectId: string | null;
  urn: string | null;
  status: string | null;
  progress: string | null;
  manifestJson?: unknown | null;
  lastError?: string | null;
};

export function normalizeApsDerivativeStatus(
  status: string | null | undefined,
): ApsDerivativeStatus {
  const value = (status || "").toLowerCase();

  if (value === "success" || value === "ready") return "ready";
  if (value === "failed" || value === "error") return "failed";
  if (value === "uploaded") return "uploaded";
  if (value === "queued" || value === "pending") return "queued";
  if (value === "inprogress" || value === "translating") return "translating";
  return "queued";
}

export function toLegacyApsStatus(status: string | null | undefined) {
  const normalized = normalizeApsDerivativeStatus(status);

  if (normalized === "ready") return "success";
  if (normalized === "failed") return "failed";
  if (normalized === "uploaded") return "uploaded";
  return "inprogress";
}

export function isReusableApsDerivative(
  derivative: Pick<ApsDerivativeRow, "aps_urn" | "status"> | null,
) {
  return Boolean(
    derivative?.aps_urn &&
      ["queued", "uploaded", "translating", "ready"].includes(
        derivative.status,
      ),
  );
}

export async function getApsDerivativeForPartFile(
  admin: AdminClient,
  partFileId: string,
) {
  const { data, error } = await admin
    .from("aps_derivatives")
    .select("*")
    .eq("part_file_id", partFileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ApsDerivativeRow | null) ?? null;
}

export async function getApsDerivativeForProviderPackageFile(
  admin: AdminClient,
  providerPackageFileId: string,
) {
  const { data, error } = await admin
    .from("aps_derivatives")
    .select("*")
    .eq("provider_package_file_id", providerPackageFileId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ApsDerivativeRow | null) ?? null;
}

export async function upsertApsDerivativeFromLegacy(
  admin: AdminClient,
  source: LegacyDerivativeSource,
) {
  if (!source.urn) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const status = normalizeApsDerivativeStatus(source.status);
  const match =
    source.sourceType === "part_file"
      ? { part_file_id: source.partFileId }
      : { provider_package_file_id: source.providerPackageFileId };

  const payload = {
    organization_id: source.organizationId,
    source_type: source.sourceType,
    part_file_id: source.partFileId ?? null,
    provider_package_file_id: source.providerPackageFileId ?? null,
    source_file_name: source.fileName,
    source_storage_path: source.storagePath,
    aps_object_key: source.objectKey,
    aps_object_id: source.objectId,
    aps_urn: source.urn,
    status,
    progress: source.progress,
    manifest_json: source.manifestJson ?? null,
    last_error: source.lastError ?? null,
    requested_by: source.requestedBy,
    last_prepared_at: nowIso,
    last_translated_at: status === "ready" ? nowIso : null,
  };

  const { data: existing, error: existingError } = await admin
    .from("aps_derivatives")
    .select("*")
    .match(match)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from("aps_derivatives")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as ApsDerivativeRow;
  }

  const { data, error } = await admin
    .from("aps_derivatives")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ApsDerivativeRow;
}

export async function saveApsDerivativeState(
  admin: AdminClient,
  params: {
    organizationId: string;
    requestedBy: string;
    sourceType: "part_file" | "provider_package_file";
    partFileId?: string | null;
    providerPackageFileId?: string | null;
    fileName?: string | null;
    storagePath?: string | null;
    objectKey?: string | null;
    objectId?: string | null;
    urn?: string | null;
    status: ApsDerivativeStatus;
    progress?: string | null;
    manifestJson?: unknown | null;
    lastError?: string | null;
  },
) {
  const match =
    params.sourceType === "part_file"
      ? { part_file_id: params.partFileId }
      : { provider_package_file_id: params.providerPackageFileId };

  const nowIso = new Date().toISOString();
  const payload = {
    organization_id: params.organizationId,
    source_type: params.sourceType,
    part_file_id: params.partFileId ?? null,
    provider_package_file_id: params.providerPackageFileId ?? null,
    source_file_name: params.fileName ?? null,
    source_storage_path: params.storagePath ?? null,
    aps_object_key: params.objectKey ?? null,
    aps_object_id: params.objectId ?? null,
    aps_urn: params.urn ?? null,
    status: params.status,
    progress: params.progress ?? null,
    manifest_json: params.manifestJson ?? null,
    last_error: params.lastError ?? null,
    requested_by: params.requestedBy,
    last_prepared_at: nowIso,
    last_translated_at: params.status === "ready" ? nowIso : null,
  };

  const { data: existing, error: existingError } = await admin
    .from("aps_derivatives")
    .select("id")
    .match(match)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from("aps_derivatives")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as ApsDerivativeRow;
  }

  const { data, error } = await admin
    .from("aps_derivatives")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ApsDerivativeRow;
}

export async function reserveApsTranslationQuota(
  admin: AdminClient,
  organizationId: string,
) {
  const { data, error } = await admin.rpc("reserve_aps_translation_quota", {
    p_organization_id: organizationId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as QuotaRow[];
  const row = rows[0];

  if (!row) {
    throw new Error("Could not reserve APS translation quota.");
  }

  return row;
}
