import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testFormlabsProfile } from "@/lib/internal-connectors/formlabs";
import type { InternalConnectorCredentialProfileSecretRecord } from "@/lib/internal-connectors/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

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
      "id, organization_id, provider_key, display_name, client_id, client_secret_ciphertext, client_secret_iv, client_secret_tag",
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

  const membershipResult = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profileResult.data.organization_id)
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
        "Only customer organization admins can test connector credentials.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    profile: profileResult.data as InternalConnectorCredentialProfileSecretRecord,
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

  const { profileId } = await context.params;
  const managed = await getManagedProfile(supabase, profileId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  try {
    if (managed.profile.provider_key !== "formlabs") {
      throw new Error(
        `Credential profile test is not implemented for provider "${managed.profile.provider_key}" yet.`,
      );
    }

    const result = await testFormlabsProfile(managed.profile);

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
      message: result.message,
      printerCount: result.printerCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Credential test failed.";

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