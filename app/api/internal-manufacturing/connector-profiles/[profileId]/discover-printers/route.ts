import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { discoverFormlabsPrinters } from "@/lib/internal-connectors/formlabs";
import { discoverMarkforgedDevices } from "@/lib/internal-connectors/markforged";
import { discoverStratasysMachines } from "@/lib/internal-connectors/stratasys";
import { discoverUltimakerPrinters } from "@/lib/internal-connectors/ultimaker";
import type {
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
} from "@/lib/internal-connectors/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

type ManagedProfileRow = InternalConnectorCredentialProfileSecretRecord;
type OrgConnectionRow = InternalResourceConnection;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getManagedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string,
) {
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
    .eq("id", profileId)
    .maybeSingle();

  if (profileResult.error) {
    return {
      ok: false as const,
      response: jsonError(profileResult.error.message, 500),
    };
  }

  if (!profileResult.data) {
    return {
      ok: false as const,
      response: jsonError("Credential profile not found.", 404),
    };
  }

  const profile = profileResult.data as unknown as ManagedProfileRow;

  const membershipResult = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      ok: false as const,
      response: jsonError(membershipResult.error.message, 500),
    };
  }

  if (!membershipResult.data || membershipResult.data.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can discover machines.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    profile,
  };
}

async function resolveStratasysConnectionContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<OrgConnectionRow> {
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
    .eq("organization_id", profile.organization_id)
    .eq("provider_key", "stratasys")
    .eq("credential_profile_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionResult.error) {
    throw new Error(connectionResult.error.message);
  }

  if (!connectionResult.data) {
    throw new Error(
      "Stratasys discovery requires at least one saved Stratasys connector using this credential profile so the base URL and metadata context are known.",
    );
  }

  return connectionResult.data as unknown as OrgConnectionRow;
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

  const { profileId } = await context.params;
  const managed = await getManagedProfile(supabase, profileId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  try {
    let printers: unknown[] = [];

    if (managed.profile.provider_key === "formlabs") {
      printers = await discoverFormlabsPrinters(managed.profile);
    } else if (managed.profile.provider_key === "ultimaker") {
      printers = await discoverUltimakerPrinters(managed.profile);
    } else if (managed.profile.provider_key === "markforged") {
      printers = await discoverMarkforgedDevices(managed.profile);
    } else if (managed.profile.provider_key === "stratasys") {
      const connectionContext = await resolveStratasysConnectionContext(
        supabase,
        managed.profile,
      );

      if (!connectionContext.base_url) {
        throw new Error(
          "Stratasys discovery requires baseUrl on the saved connector.",
        );
      }

      printers = await discoverStratasysMachines(
        managed.profile,
        connectionContext.base_url,
        connectionContext,
      );
    } else if (managed.profile.provider_key === "hp") {
      throw new Error(
        'Printer discovery is not implemented for provider "hp" yet.',
      );
    } else {
      throw new Error(
        `Printer discovery is not implemented for provider "${managed.profile.provider_key}" yet.`,
      );
    }

    await supabase
      .from("internal_connector_profiles")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: "ok",
        last_test_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", managed.profile.id);

    return NextResponse.json({
      ok: true,
      printers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to discover machines.";

    await supabase
      .from("internal_connector_profiles")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: "error",
        last_test_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", managed.profile.id);

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 400 },
    );
  }
}