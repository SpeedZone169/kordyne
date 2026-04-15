import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testFormlabsConnection } from "@/lib/internal-connectors/formlabs";
import { testMarkforgedConnection } from "@/lib/internal-connectors/markforged";
import { testStratasysConnection } from "@/lib/internal-connectors/stratasys";
import { testUltimakerConnection } from "@/lib/internal-connectors/ultimaker";
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
  ok: boolean,
  message: string | null,
) {
  await supabase
    .from("internal_resource_connections")
    .update({
      last_sync_status: ok ? "ok" : "error",
      last_error: ok ? null : message,
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
        "Only customer organization admins can test internal connectors.",
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

  try {
    const profile = await getCredentialProfile(supabase, connection);

    let result:
      | {
          message: string;
          rawStatus?: string | null;
          mappedStatus?: string | null;
        }
      | null = null;

    if (connection.provider_key === "formlabs") {
      if (!profile) {
        throw new Error("Formlabs connector requires a saved credential profile.");
      }

      result = await testFormlabsConnection(connection, profile);
    } else if (connection.provider_key === "ultimaker") {
      if (!profile) {
        throw new Error("Ultimaker connector requires a saved credential profile.");
      }

      result = await testUltimakerConnection(connection, profile);
    } else if (connection.provider_key === "markforged") {
      if (!profile) {
        throw new Error("Markforged connector requires a saved credential profile.");
      }

      result = await testMarkforgedConnection(connection, profile);
    } else if (connection.provider_key === "stratasys") {
      if (!profile) {
        throw new Error("Stratasys connector requires a saved credential profile.");
      }

      result = await testStratasysConnection(connection, profile);
    } else if (connection.provider_key === "hp") {
      const message = 'Real test adapter is not implemented for provider "hp" yet.';
      await markConnection(supabase, connection.id, false, message);

      return NextResponse.json({
        ok: false,
        message,
      });
    } else {
      const message = `Real test adapter is not implemented for provider "${connection.provider_key}" yet.`;
      await markConnection(supabase, connection.id, false, message);

      return NextResponse.json({
        ok: false,
        message,
      });
    }

    await markConnection(supabase, connection.id, true, null);

    return NextResponse.json({
      ok: true,
      message: result.message,
      rawStatus: result.rawStatus ?? null,
      mappedStatus: result.mappedStatus ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Connector test failed.";

    await markConnection(supabase, connection.id, false, message);

    return NextResponse.json({
      ok: false,
      message,
    });
  }
}