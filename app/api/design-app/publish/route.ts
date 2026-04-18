import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { getDesignConnectorAdapter } from "../../../../lib/design-connectors/adapters";
import type {
  DesignAppPublishInput,
  DesignConnectorProfileRecord,
} from "../../../../lib/design-connectors/types";

type PublishMode = "new_family" | "new_revision" | "existing_revision";

type PartRow = {
  id: string;
  organization_id: string;
  part_family_id: string;
  name: string;
  part_number: string | null;
  description: string | null;
  process_type: string | null;
  material: string | null;
  category: string | null;
  status: string | null;
};

type PartSourceLinkRow = {
  id: string;
  organization_id: string;
  provider_key: string;
  credential_profile_id: string | null;
  design_connector_id: string | null;
  part_family_id: string | null;
  part_id: string | null;
  external_workspace_id: string | null;
  external_project_id: string | null;
  external_document_id: string | null;
  external_item_id: string | null;
  external_version_id: string | null;
  external_revision_id: string | null;
  external_name: string | null;
  external_url: string | null;
  sync_mode: string;
  is_bidirectional: boolean;
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parsePublishInput(body: unknown): DesignAppPublishInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;

  if (typeof input.provider_key !== "string" || input.provider_key.trim().length === 0) {
    throw new Error("provider_key is required.");
  }

  const files = Array.isArray(input.files)
    ? input.files
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const row = item as Record<string, unknown>;

          if (typeof row.role !== "string" || row.role.trim().length === 0) {
            throw new Error("Each file requires a role.");
          }

          if (typeof row.filename !== "string" || row.filename.trim().length === 0) {
            throw new Error("Each file requires a filename.");
          }

          return {
            role: row.role.trim(),
            filename: row.filename.trim(),
            mime_type: asNullableString(row.mime_type),
            storage_path: asNullableString(row.storage_path),
            size_bytes:
              typeof row.size_bytes === "number" && Number.isFinite(row.size_bytes)
                ? row.size_bytes
                : null,
          };
        })
    : [];

  return {
    provider_key: input.provider_key.trim() as DesignAppPublishInput["provider_key"],
    connector_id: asNullableString(input.connector_id),
    profile_id: asNullableString(input.profile_id),
    external_workspace_id: asNullableString(input.external_workspace_id),
    external_project_id: asNullableString(input.external_project_id),
    external_document_id: asNullableString(input.external_document_id),
    external_item_id: asNullableString(input.external_item_id),
    external_version_id: asNullableString(input.external_version_id),
    external_revision_id: asNullableString(input.external_revision_id),
    external_name: asNullableString(input.external_name),
    external_url: asNullableString(input.external_url),
    part_family_id: asNullableString(input.part_family_id),
    part_id: asNullableString(input.part_id),
    metadata: asObject(input.metadata),
    files,
  };
}

function toProfileRecord(
  row: Record<string, unknown>,
): DesignConnectorProfileRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    provider_key: String(row.provider_key),
    display_name: String(row.display_name),
    auth_mode: row.auth_mode ? String(row.auth_mode) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
    last_test_status: row.last_test_status ? String(row.last_test_status) : null,
    last_test_error: row.last_test_error ? String(row.last_test_error) : null,
    created_by_user_id: row.created_by_user_id
      ? String(row.created_by_user_id)
      : null,
    updated_by_user_id: row.updated_by_user_id
      ? String(row.updated_by_user_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    token_expires_at: row.token_expires_at
      ? String(row.token_expires_at)
      : null,
  };
}

function getStringMetadata(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function getPublishMode(
  metadata: Record<string, unknown>,
  hasPartId: boolean,
): PublishMode {
  const raw = metadata.publish_mode;
  if (raw === "new_family" || raw === "new_revision" || raw === "existing_revision") {
    return raw;
  }

  return hasPartId ? "existing_revision" : "new_family";
}

function mapRoleToAssetCategory(role: string): string {
  switch (role) {
    case "step":
    case "native_cad":
      return "cad_3d";
    case "drawing_pdf":
    case "drawing_native":
      return "drawing_2d";
    case "preview_image":
      return "image";
    case "manufacturing_doc":
      return "manufacturing_doc";
    case "quality_doc":
      return "quality_doc";
    default:
      return "other";
  }
}

function mapMimeToFileType(mimeType: string | null, filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? null;
  if (ext) return ext;
  if (!mimeType) return null;

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return mimeType.replace("image/", "");
  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const input = parsePublishInput(body);

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json({ error: "No organization membership found." }, { status: 403 });
    }

    if (!["admin", "engineer"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only engineers and admins can publish CAD data into the vault." },
        { status: 403 },
      );
    }

    let connector:
      | {
          id: string;
          organization_id: string;
          provider_key: string;
          credential_profile_id: string;
        }
      | null = null;

    if (input.connector_id) {
      const { data: connectorRow, error: connectorError } = await supabase
        .from("design_connectors")
        .select("id, organization_id, provider_key, credential_profile_id")
        .eq("id", input.connector_id)
        .maybeSingle();

      if (connectorError) {
        return NextResponse.json({ error: connectorError.message }, { status: 500 });
      }

      if (!connectorRow) {
        return NextResponse.json({ error: "Design connector not found." }, { status: 404 });
      }

      if (connectorRow.organization_id !== membership.organization_id) {
        return NextResponse.json(
          { error: "Connector does not belong to your organization." },
          { status: 403 },
        );
      }

      connector = connectorRow;
    }

    const resolvedProfileId = input.profile_id ?? connector?.credential_profile_id ?? null;

    if (!resolvedProfileId) {
      return NextResponse.json(
        { error: "profile_id or connector_id is required." },
        { status: 400 },
      );
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("*")
      .eq("id", resolvedProfileId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profileRow) {
      return NextResponse.json({ error: "Credential profile not found." }, { status: 404 });
    }

    if (profileRow.organization_id !== membership.organization_id) {
      return NextResponse.json(
        { error: "Credential profile does not belong to your organization." },
        { status: 403 },
      );
    }

    if (profileRow.provider_key !== input.provider_key) {
      return NextResponse.json(
        { error: "provider_key does not match the selected credential profile." },
        { status: 400 },
      );
    }

    const profile = toProfileRecord(profileRow as Record<string, unknown>);
    const adapter = getDesignConnectorAdapter(input.provider_key);

    const { data: syncRun, error: syncRunError } = await supabase
      .from("design_sync_runs")
      .insert({
        organization_id: membership.organization_id,
        provider_key: input.provider_key,
        design_connector_id: connector?.id ?? input.connector_id ?? null,
        credential_profile_id: profile.id,
        run_type: "publish",
        direction: "cad_to_kordyne",
        target_ref: input.external_document_id ?? input.external_item_id ?? input.part_id ?? null,
        status: "running",
        summary: {
          external_document_id: input.external_document_id ?? null,
          external_item_id: input.external_item_id ?? null,
          external_version_id: input.external_version_id ?? null,
          requested_part_id: input.part_id ?? null,
          requested_part_family_id: input.part_family_id ?? null,
          file_count: input.files?.length ?? 0,
        },
        triggered_by_user_id: user.id,
      })
      .select("id")
      .single();

    if (syncRunError) {
      return NextResponse.json({ error: syncRunError.message }, { status: 500 });
    }

    try {
      const publishResult = adapter.publish
        ? await adapter.publish(profile, input)
        : {
            ok: false,
            provider_key: input.provider_key,
            message: `Publish is not implemented for provider '${input.provider_key}'.`,
            metadata: {},
          };

      const metadata = input.metadata ?? {};
      const publishMode = getPublishMode(metadata, Boolean(input.part_id));

      let targetPartId: string | null = input.part_id ?? null;
      let targetPartFamilyId: string | null = input.part_family_id ?? null;

      if (publishMode === "new_family") {
        const name =
          getStringMetadata(metadata, ["name", "part_name", "title"]) ??
          input.external_name;

        if (!name) {
          throw new Error(
            "A part name is required to create a new family. Provide external_name or metadata.name.",
          );
        }

        const partNumber = getStringMetadata(metadata, ["part_number"]);
        const description = getStringMetadata(metadata, ["description"]);
        const processType = getStringMetadata(metadata, ["process_type"]);
        const material = getStringMetadata(metadata, ["material"]);
        const revisionScheme =
          getStringMetadata(metadata, ["revision_scheme"]) ?? "alphabetic";
        const category = getStringMetadata(metadata, ["category"]);
        const status = getStringMetadata(metadata, ["status"]) ?? "draft";

        const { data: newPartId, error: createFamilyError } = await supabase.rpc(
          "create_part_with_family",
          {
            p_name: name,
            p_part_number: partNumber,
            p_description: description,
            p_process_type: processType,
            p_material: material,
            p_revision_scheme: revisionScheme,
            p_category: category,
            p_status: status,
          },
        );

        if (createFamilyError || !newPartId) {
          throw new Error(createFamilyError?.message || "Failed to create new part family.");
        }

        targetPartId = newPartId;

        const { data: createdPart, error: createdPartError } = await supabase
          .from("parts")
          .select("id, part_family_id")
          .eq("id", newPartId)
          .single();

        if (createdPartError || !createdPart) {
          throw new Error(createdPartError?.message || "Failed to load created part.");
        }

        targetPartFamilyId = createdPart.part_family_id;
      } else if (publishMode === "new_revision") {
        const sourcePartId = input.part_id ?? getStringMetadata(metadata, ["source_part_id"]);

        if (!sourcePartId) {
          throw new Error("part_id is required to create a new revision.");
        }

        const { data: sourcePart, error: sourcePartError } = await supabase
          .from("parts")
          .select("id, organization_id, part_family_id")
          .eq("id", sourcePartId)
          .single();

        if (sourcePartError || !sourcePart) {
          throw new Error(sourcePartError?.message || "Source part not found.");
        }

        if (sourcePart.organization_id !== membership.organization_id) {
          throw new Error("Source part does not belong to your organization.");
        }

        const revisionNote =
          getStringMetadata(metadata, ["revision_note", "change_note"]) ??
          `Published from ${input.provider_key}`;

        const { data: newRevisionId, error: createRevisionError } = await supabase.rpc(
          "create_part_revision",
          {
            p_source_part_id: sourcePartId,
            p_revision_note: revisionNote,
          },
        );

        if (createRevisionError || !newRevisionId) {
          throw new Error(
            createRevisionError?.message || "Failed to create new revision.",
          );
        }

        targetPartId = newRevisionId;
        targetPartFamilyId = sourcePart.part_family_id;
      } else {
        if (!targetPartId) {
          throw new Error(
            "part_id is required when publish_mode is existing_revision.",
          );
        }

        const { data: existingPart, error: existingPartError } = await supabase
          .from("parts")
          .select("id, organization_id, part_family_id")
          .eq("id", targetPartId)
          .single();

        if (existingPartError || !existingPart) {
          throw new Error(existingPartError?.message || "Target part not found.");
        }

        if (existingPart.organization_id !== membership.organization_id) {
          throw new Error("Target part does not belong to your organization.");
        }

        targetPartFamilyId = existingPart.part_family_id;
      }

      if (!targetPartId || !targetPartFamilyId) {
        throw new Error("Failed to resolve target part or part family.");
      }

      const { data: targetPart, error: targetPartError } = await supabase
        .from("parts")
        .select(
          "id, organization_id, part_family_id, name, part_number, description, process_type, material, category, status",
        )
        .eq("id", targetPartId)
        .single();

      if (targetPartError || !targetPart) {
        throw new Error(targetPartError?.message || "Failed to load target part.");
      }

      const existingLinkQuery = supabase
        .from("part_source_links")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .eq("provider_key", input.provider_key);

      const externalDocumentId =
        publishResult.external_ref?.document_id ?? input.external_document_id ?? null;
      const externalItemId =
        publishResult.external_ref?.item_id ?? input.external_item_id ?? null;
      const externalVersionId =
        publishResult.external_ref?.version_id ?? input.external_version_id ?? null;

      let existingLink: PartSourceLinkRow | null = null;

      if (externalDocumentId) {
        const { data } = await existingLinkQuery
          .eq("external_document_id", externalDocumentId)
          .maybeSingle();
        existingLink = (data as PartSourceLinkRow | null) ?? null;
      } else if (externalItemId) {
        const { data } = await existingLinkQuery
          .eq("external_item_id", externalItemId)
          .maybeSingle();
        existingLink = (data as PartSourceLinkRow | null) ?? null;
      }

      const sourceLinkPayload = {
        organization_id: membership.organization_id,
        provider_key: input.provider_key,
        credential_profile_id: profile.id,
        design_connector_id: connector?.id ?? input.connector_id ?? null,
        part_family_id: targetPartFamilyId,
        part_id: targetPartId,
        external_workspace_id:
          publishResult.external_ref?.workspace_id ?? input.external_workspace_id ?? null,
        external_project_id:
          publishResult.external_ref?.project_id ?? input.external_project_id ?? null,
        external_document_id: externalDocumentId,
        external_item_id: externalItemId,
        external_version_id: externalVersionId,
        external_revision_id:
          publishResult.external_ref?.revision_id ?? input.external_revision_id ?? null,
        external_name:
          publishResult.external_ref?.name ?? input.external_name ?? targetPart.name,
        external_url:
          publishResult.external_ref?.url ?? input.external_url ?? null,
        sync_mode: "manual",
        is_bidirectional: true,
        metadata: {
          publish_mode: publishMode,
          publish_metadata: metadata,
          adapter_metadata: publishResult.metadata ?? {},
        },
        last_sync_at: new Date().toISOString(),
        last_sync_status: publishResult.ok ? "succeeded" : "failed",
        last_error: publishResult.ok ? null : publishResult.message,
      };

      let sourceLinkId: string;

      if (existingLink) {
        const { data: updatedLink, error: updateLinkError } = await supabase
          .from("part_source_links")
          .update(sourceLinkPayload)
          .eq("id", existingLink.id)
          .select("id")
          .single();

        if (updateLinkError || !updatedLink) {
          throw new Error(updateLinkError?.message || "Failed to update source link.");
        }

        sourceLinkId = updatedLink.id;
      } else {
        const { data: insertedLink, error: insertLinkError } = await supabase
          .from("part_source_links")
          .insert(sourceLinkPayload)
          .select("id")
          .single();

        if (insertLinkError || !insertedLink) {
          throw new Error(insertLinkError?.message || "Failed to create source link.");
        }

        sourceLinkId = insertedLink.id;
      }

      const filesToInsert = (input.files ?? []).filter((file) => file.storage_path);

      if (filesToInsert.length > 0) {
        const fileRows = filesToInsert.map((file) => ({
          part_id: targetPartId,
          user_id: user.id,
          file_name: file.filename,
          file_type: mapMimeToFileType(file.mime_type ?? null, file.filename),
          asset_category: mapRoleToAssetCategory(file.role),
          storage_path: file.storage_path as string,
          file_size_bytes: file.size_bytes ?? null,
        }));

        const { error: insertFilesError } = await supabase
          .from("part_files")
          .insert(fileRows);

        if (insertFilesError) {
          throw new Error(insertFilesError.message);
        }
      }

      const completedAt = new Date().toISOString();

      const { error: runUpdateError } = await supabase
        .from("design_sync_runs")
        .update({
          status: publishResult.ok ? "succeeded" : "failed",
          completed_at: completedAt,
          summary: {
            publish_mode: publishMode,
            part_id: targetPart.id,
            part_family_id: targetPart.part_family_id,
            source_link_id: sourceLinkId,
            external_document_id: externalDocumentId,
            external_item_id: externalItemId,
            external_version_id: externalVersionId,
            file_count: input.files?.length ?? 0,
            inserted_file_rows: filesToInsert.length,
          },
          error_message: publishResult.ok ? null : publishResult.message,
        })
        .eq("id", syncRun.id);

      if (runUpdateError) {
        throw new Error(runUpdateError.message);
      }

      if (connector?.id) {
        const { error: connectorUpdateError } = await supabase
          .from("design_connectors")
          .update({
            last_sync_at: completedAt,
            last_sync_status: publishResult.ok ? "succeeded" : "failed",
            last_error: publishResult.ok ? null : publishResult.message,
            updated_by_user_id: user.id,
          })
          .eq("id", connector.id);

        if (connectorUpdateError) {
          throw new Error(connectorUpdateError.message);
        }
      }

      const { error: auditError } = await supabase
        .from("design_connector_audit_events")
        .insert({
          organization_id: membership.organization_id,
          provider_key: input.provider_key,
          design_connector_id: connector?.id ?? input.connector_id ?? null,
          credential_profile_id: profile.id,
          actor_user_id: user.id,
          event_type: "design_publish",
          target_type: "part",
          target_id: targetPart.id,
          details: {
            sync_run_id: syncRun.id,
            source_link_id: sourceLinkId,
            publish_mode: publishMode,
            part_id: targetPart.id,
            part_family_id: targetPart.part_family_id,
            external_document_id: externalDocumentId,
            external_item_id: externalItemId,
            external_version_id: externalVersionId,
            inserted_file_rows: filesToInsert.length,
            ok: publishResult.ok,
            message: publishResult.message,
          },
        });

      if (auditError) {
        throw new Error(auditError.message);
      }

      return NextResponse.json({
        ok: publishResult.ok,
        sync_run_id: syncRun.id,
        source_link_id: sourceLinkId,
        part_id: targetPart.id,
        part_family_id: targetPart.part_family_id,
        publish_mode: publishMode,
        message: publishResult.message,
        external_ref: publishResult.external_ref ?? {},
        details: {
          adapter: publishResult.metadata ?? {},
          inserted_file_rows: filesToInsert.length,
        },
      });
    } catch (innerError) {
      const failedAt = new Date().toISOString();

      await supabase
        .from("design_sync_runs")
        .update({
          status: "failed",
          completed_at: failedAt,
          error_message:
            innerError instanceof Error ? innerError.message : "Publish failed.",
        })
        .eq("id", syncRun.id);

      if (connector?.id) {
        await supabase
          .from("design_connectors")
          .update({
            last_sync_at: failedAt,
            last_sync_status: "failed",
            last_error:
              innerError instanceof Error ? innerError.message : "Publish failed.",
            updated_by_user_id: user.id,
          })
          .eq("id", connector.id);
      }

      return NextResponse.json(
        {
          error:
            innerError instanceof Error ? innerError.message : "Publish failed.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
