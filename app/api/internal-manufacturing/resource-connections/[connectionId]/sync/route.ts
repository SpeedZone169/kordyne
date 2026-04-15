import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncFormlabsConnection } from "@/lib/internal-connectors/formlabs";
import { syncMarkforgedConnection } from "@/lib/internal-connectors/markforged";
import { syncStratasysConnection } from "@/lib/internal-connectors/stratasys";
import { syncUltimakerConnection } from "@/lib/internal-connectors/ultimaker";
import type {
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
} from "@/lib/internal-connectors/types";

type RouteContext = {
  params: Promise<{ connectionId: string }>;
};

type ManagedConnectionRow = InternalResourceConnection;
type ManagedProfileRow = InternalConnectorCredentialProfileSecretRecord;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function markConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connectionId: string,
  status: "ok" | "error" | "disabled",
  message: string | null,
) {
  await supabase
    .from("internal_resource_connections")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
      last_error: status === "ok" ? null : message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);
}

async function getManagedConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connectionId: string,
  userId: string,
) {
  const connectionResult = await supabase
    .from("internal_resource_connections")
    .select(
      [
        "id",
        "organization_id",
        "resource_id",
        "provider_key",
        "connection_mode",
        "display_name",
        "vault_secret_name",
        "vault_secret_id",
        "credential_profile_id",
        "base_url",
        "external_resource_id",
        "sync_enabled",
        "metadata",
      ].join(", "),
    )
    .eq("id", connectionId)
    .maybeSingle();

  if (connectionResult.error) {
    return {
      ok: false as const,
      response: jsonError(connectionResult.error.message, 500),
    };
  }

  if (!connectionResult.data) {
    return {
      ok: false as const,
      response: jsonError("Connector not found.", 404),
    };
  }

  const connection = connectionResult.data as unknown as ManagedConnectionRow;

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", connection.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      ok: false as const,
      response: jsonError(membershipResult.error.message, 500),
    };
  }

  if (!membershipResult.data) {
    return {
      ok: false as const,
      response: jsonError("You do not have access to this organization.", 403),
    };
  }

  if (membershipResult.data.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can sync internal connectors.",
        403,
      ),
    };
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", connection.organization_id)
    .maybeSingle();

  if (organizationResult.error) {
    return {
      ok: false as const,
      response: jsonError(organizationResult.error.message, 500),
    };
  }

  if (
    !organizationResult.data ||
    organizationResult.data.organization_type !== "customer"
  ) {
    return {
      ok: false as const,
      response: jsonError(
        "Internal connectors are only available for customer organizations.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    connection,
  };
}

async function getCredentialProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connection: InternalResourceConnection,
) {
  if (!connection.credential_profile_id) {
    return null;
  }

  const profileResult = await supabase
    .from("internal_connector_profiles")
    .select(
      [
        "id",
        "organization_id",
        "provider_key",
        "display_name",
        "auth_mode",
        "client_id",
        "client_secret_ciphertext",
        "client_secret_iv",
        "client_secret_tag",
        "access_token_ciphertext",
        "access_token_iv",
        "access_token_tag",
        "refresh_token_ciphertext",
        "refresh_token_iv",
        "refresh_token_tag",
        "token_expires_at",
      ].join(", "),
    )
    .eq("id", connection.credential_profile_id)
    .eq("organization_id", connection.organization_id)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (!profileResult.data) {
    throw new Error("Selected credential profile no longer exists.");
  }

  return profileResult.data as unknown as ManagedProfileRow;
}

function getProviderLabel(providerKey: string) {
  if (providerKey === "formlabs") return "Formlabs";
  if (providerKey === "ultimaker") return "Ultimaker";
  if (providerKey === "markforged") return "Markforged";
  if (providerKey === "stratasys") return "Stratasys";
  if (providerKey === "hp") return "HP";
  return providerKey;
}

export async function POST(_request: Request, context: RouteContext) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const { connectionId } = await context.params;
  const managed = await getManagedConnection(supabase, connectionId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  const connection = managed.connection;

  if (!connection.sync_enabled) {
    const message = "Connector is disabled. Enable sync before syncing.";
    await markConnection(supabase, connection.id, "disabled", message);

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }

  if (!connection.resource_id) {
    const message = "Connector is not attached to an internal resource.";
    await markConnection(supabase, connection.id, "error", message);

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }

  try {
    const profile = await getCredentialProfile(supabase, connection);

    let syncResult:
      | {
          status: string;
          rawStatus: string | null;
          reasonCode: string;
          reasonDetail: string;
          effectiveAt: string;
          payload: Record<string, unknown>;
        }
      | null = null;

    if (connection.provider_key === "formlabs") {
      if (!profile) {
        throw new Error("Formlabs connector requires a saved credential profile.");
      }

      syncResult = await syncFormlabsConnection(connection, profile);
    } else if (connection.provider_key === "ultimaker") {
      if (!profile) {
        throw new Error("Ultimaker connector requires a saved credential profile.");
      }

      syncResult = await syncUltimakerConnection(connection, profile);
    } else if (connection.provider_key === "markforged") {
      if (!profile) {
        throw new Error("Markforged connector requires a saved credential profile.");
      }

      syncResult = await syncMarkforgedConnection(connection, profile);
    } else if (connection.provider_key === "stratasys") {
      if (!profile) {
        throw new Error("Stratasys connector requires a saved credential profile.");
      }

      syncResult = await syncStratasysConnection(connection, profile);
    } else if (connection.provider_key === "hp") {
      const message = 'Real sync adapter is not implemented for provider "hp" yet.';
      await markConnection(supabase, connection.id, "error", message);

      return NextResponse.json(
        {
          ok: false,
          message,
        },
        { status: 400 },
      );
    } else {
      const message = `Real sync adapter is not implemented for provider "${connection.provider_key}" yet.`;
      await markConnection(supabase, connection.id, "error", message);

      return NextResponse.json(
        {
          ok: false,
          message,
        },
        { status: 400 },
      );
    }

    const resourceResult = await supabase
      .from("internal_resources")
      .update({
        current_status: syncResult.status,
        status_source: "vendor_api",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.resource_id)
      .eq("organization_id", connection.organization_id)
      .select(
        "id, organization_id, name, current_status, status_source, updated_at",
      )
      .single();

    if (resourceResult.error) {
      throw new Error(resourceResult.error.message);
    }

    const eventResult = await supabase
      .from("internal_resource_status_events")
      .insert({
        organization_id: connection.organization_id,
        resource_id: connection.resource_id,
        source: "integration_sync",
        status: syncResult.status,
        reason_code: syncResult.reasonCode,
        reason_detail: syncResult.reasonDetail,
        effective_at: syncResult.effectiveAt,
        entered_by_user_id: user.id,
        payload: syncResult.payload,
      })
      .select(
        "id, organization_id, resource_id, source, status, reason_code, reason_detail, effective_at, entered_by_user_id, payload, created_at",
      )
      .single();

    if (eventResult.error) {
      throw new Error(eventResult.error.message);
    }

    await markConnection(supabase, connection.id, "ok", null);

    return NextResponse.json({
      ok: true,
      message: `Synced ${getProviderLabel(connection.provider_key)} machine as ${syncResult.status}.`,
      status: syncResult.status,
      rawStatus: syncResult.rawStatus,
      resource: resourceResult.data,
      statusEvent: eventResult.data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connector sync failed.";

    await markConnection(supabase, connection.id, "error", message);

    return NextResponse.json({
      ok: false,
      message,
    });
  }
}