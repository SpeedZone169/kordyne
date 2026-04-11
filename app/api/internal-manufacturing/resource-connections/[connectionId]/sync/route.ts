import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    connectionId: string;
  }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getManagedConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connectionId: string,
  userId: string,
) {
  const connectionResult = await supabase
    .from("internal_resource_connections")
    .select(
      "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, base_url, external_resource_id, sync_enabled, metadata",
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

  const connection = connectionResult.data as {
    id: string;
    organization_id: string;
    resource_id: string | null;
    provider_key: string;
    connection_mode: string;
    display_name: string;
    vault_secret_name: string | null;
    vault_secret_id: string | null;
    base_url: string | null;
    external_resource_id: string | null;
    sync_enabled: boolean;
    metadata: Record<string, unknown> | null;
  };

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

  const membership = membershipResult.data as {
    organization_id: string;
    role: string | null;
  };

  if (membership.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can test internal connectors.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    connection,
  };
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

  const hasSecretReference =
    Boolean(connection.vault_secret_name) || Boolean(connection.vault_secret_id);

  const hasAddress =
    connection.connection_mode === "manual"
      ? true
      : Boolean(connection.base_url) || connection.connection_mode === "oauth" || connection.connection_mode === "api_key";

  const hasExternalMapping = Boolean(connection.external_resource_id);

  let ok = true;
  let message = "Connector configuration looks valid.";

  if (!connection.sync_enabled) {
    ok = false;
    message = "Connector is disabled. Enable sync before testing.";
  } else if (!hasSecretReference && connection.connection_mode !== "manual") {
    ok = false;
    message =
      "Missing vault secret reference. Add vault_secret_name or vault_secret_id.";
  } else if (!hasAddress) {
    ok = false;
    message =
      "Missing connection endpoint details. Add base_url or use a supported mode.";
  } else if (!hasExternalMapping && connection.provider_key !== "manual") {
    ok = false;
    message =
      "Missing external_resource_id. Map this connector to a remote machine/printer.";
  }

  const updateResult = await supabase
    .from("internal_resource_connections")
    .update({
      last_sync_status: ok ? "ok" : "error",
      last_error: ok ? null : message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (updateResult.error) {
    return jsonError(updateResult.error.message, 500);
  }

  return NextResponse.json({
    ok,
    message,
  });
}