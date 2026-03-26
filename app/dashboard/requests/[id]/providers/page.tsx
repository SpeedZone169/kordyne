import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProviderRoutingComposer from "./ProviderRoutingComposer";
import type {
  PreviousRound,
  ProviderCandidate,
  ServiceRequestSummary,
  ShareableRequestFile,
} from "./types";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RequestProvidersPage({ params }: PageProps) {
  const { id: requestId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError || !memberships?.length) {
    notFound();
  }

  const membershipOrgIds = memberships.map((m) => m.organization_id);

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        organization_id,
        part_id,
        title,
        request_type,
        status,
        due_date,
        quantity,
        request_origin,
        requested_item_name,
        requested_item_reference,
        notes,
        created_at,
        updated_at
      `,
    )
    .eq("id", requestId)
    .single();

  if (
    requestError ||
    !request ||
    !membershipOrgIds.includes(request.organization_id)
  ) {
    notFound();
  }

  const requestSummary: ServiceRequestSummary = {
    id: request.id,
    organizationId: request.organization_id,
    partId: request.part_id,
    title: request.title,
    requestType: request.request_type,
    status: request.status,
    dueDate: request.due_date,
    quantity: request.quantity,
    requestOrigin: request.request_origin,
    requestedItemName: request.requested_item_name,
    requestedItemReference: request.requested_item_reference,
    notes: request.notes,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };

  const { data: providerRelationships, error: providerRelationshipsError } =
    await supabase
      .from("provider_relationships")
      .select(
        `
          id,
          provider_org_id,
          relationship_status,
          trust_status,
          is_preferred,
          provider_code,
          created_at
        `,
      )
      .eq("customer_org_id", request.organization_id)
      .in("relationship_status", ["invited", "active"])
      .order("is_preferred", { ascending: false })
      .order("created_at", { ascending: false });

  if (providerRelationshipsError) {
    throw new Error(providerRelationshipsError.message);
  }

  const providerOrgIds = (providerRelationships ?? []).map(
    (row) => row.provider_org_id,
  );

  let providerOrgsById = new Map<
    string,
    { id: string; name: string; slug: string | null }
  >();

  if (providerOrgIds.length > 0) {
    const { data: providerOrgs, error: providerOrgsError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .in("id", providerOrgIds);

    if (providerOrgsError) {
      throw new Error(providerOrgsError.message);
    }

    providerOrgsById = new Map(
      (providerOrgs ?? []).map((org) => [
        org.id,
        { id: org.id, name: org.name, slug: org.slug },
      ]),
    );
  }

  const providers: ProviderCandidate[] = (providerRelationships ?? [])
    .map((row) => {
      const org = providerOrgsById.get(row.provider_org_id);
      if (!org) return null;

      return {
        relationshipId: row.id,
        providerOrgId: row.provider_org_id,
        providerName: org.name,
        providerSlug: org.slug,
        relationshipStatus: row.relationship_status,
        trustStatus: row.trust_status,
        isPreferred: row.is_preferred,
        providerCode: row.provider_code,
      };
    })
    .filter(Boolean) as ProviderCandidate[];

  const shareableFiles: ShareableRequestFile[] = [];

  if (request.part_id) {
    const { data: partFiles, error: partFilesError } = await supabase
      .from("part_files")
      .select(
        `
          id,
          file_name,
          file_type,
          file_size_bytes,
          asset_category,
          storage_path,
          created_at
        `,
      )
      .eq("part_id", request.part_id)
      .order("created_at", { ascending: false });

    if (partFilesError) {
      throw new Error(partFilesError.message);
    }

    shareableFiles.push(
      ...(partFiles ?? []).map((file) => ({
        id: file.id,
        sourceType: "part_file" as const,
        fileName: file.file_name,
        fileType: file.file_type,
        fileSizeBytes: file.file_size_bytes,
        assetCategory: file.asset_category,
        storagePath: file.storage_path,
        createdAt: file.created_at,
      })),
    );
  }

  const { data: requestUploads, error: requestUploadsError } = await supabase
    .from("service_request_uploaded_files")
    .select(
      `
        id,
        file_name,
        file_type,
        file_size_bytes,
        asset_category,
        storage_path,
        created_at
      `,
    )
    .eq("service_request_id", request.id)
    .order("created_at", { ascending: false });

  if (requestUploadsError) {
    throw new Error(requestUploadsError.message);
  }

  shareableFiles.push(
    ...(requestUploads ?? []).map((file) => ({
      id: file.id,
      sourceType: "service_request_uploaded_file" as const,
      fileName: file.file_name,
      fileType: file.file_type,
      fileSizeBytes: file.file_size_bytes,
      assetCategory: file.asset_category,
      storagePath: file.storage_path,
      createdAt: file.created_at,
    })),
  );

  const { data: previousRounds, error: previousRoundsError } = await supabase
    .from("provider_quote_rounds")
    .select("id, round_number, mode, status, created_at")
    .eq("service_request_id", request.id)
    .order("round_number", { ascending: false });

  if (previousRoundsError) {
    throw new Error(previousRoundsError.message);
  }

  const rounds: PreviousRound[] =
    previousRounds?.map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      mode: round.mode,
      status: round.status,
      createdAt: round.created_at,
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">
              Provider collaboration
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Route request to providers
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Create a direct award or a quote round from this request without
              exposing your internal workspace. Providers only see the package
              you publish to them.
            </p>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <div className="text-slate-500">Request</div>
              <div className="font-medium text-slate-900">
                {requestSummary.title ||
                  requestSummary.requestedItemName ||
                  "Untitled request"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Type</div>
              <div className="font-medium capitalize text-slate-900">
                {requestSummary.requestType ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Origin</div>
              <div className="font-medium capitalize text-slate-900">
                {requestSummary.requestOrigin ?? "vault"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Files available</div>
              <div className="font-medium text-slate-900">
                {shareableFiles.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProviderRoutingComposer
        request={requestSummary}
        providers={providers}
        shareableFiles={shareableFiles}
        previousRounds={rounds}
      />
    </div>
  );
}