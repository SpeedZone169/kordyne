import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  testFormlabsProfile,
} from "@/lib/internal-connectors/formlabs";
import { testUltimakerProfile } from "@/lib/internal-connectors/ultimaker";
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
      "id, organization_id, provider_key, display_name, auth_mode, client_id, client_secret_ciphertext, client_secret_iv, client_secret_tag, access_token_ciphertext, access_token_iv, access_token_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, token_expires_at",
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
    let result: { message: string; printerCount: number };

    if (managed.profile.provider_key === "formlabs") {
      result = await testFormlabsProfile(managed.profile);
    } else if (managed.profile.provider_key === "ultimaker") {
      result = await testUltimakerProfile(managed.profile);
    } else {
      throw new Error(
        `Credential profile test is not implemented for provider "${managed.profile.provider_key}" yet.`,
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