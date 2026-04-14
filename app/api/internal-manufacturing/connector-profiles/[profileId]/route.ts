import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptConnectorSecret } from "@/lib/internal-connectors/crypto";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function maskProfilePreview(providerKey: string, clientId: string | null) {
  if (providerKey === "ultimaker") {
    return "Saved API token";
  }

  if (!clientId) {
    return "Saved credentials";
  }

  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}••••${clientId.slice(-2)}`;
  }

  return `${clientId.slice(0, 4)}••••••${clientId.slice(-4)}`;
}

async function getManagedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string,
) {
  const profileResult = await supabase
    .from("internal_connector_profiles")
    .select(
      "id, organization_id, provider_key, auth_mode, display_name, client_id, client_secret_ciphertext, client_secret_iv, client_secret_tag, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
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
        "Only customer organization admins can manage connector credentials.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    profile: profileResult.data,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
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

  let body: {
    displayName?: string;
    clientId?: string | null;
    clientSecret?: string | null;
    apiToken?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const displayName =
    normalizeOptionalText(body.displayName) ?? managed.profile.display_name;
  const clientId = normalizeOptionalText(body.clientId);
  const clientSecret = normalizeOptionalText(body.clientSecret);
  const apiToken = normalizeOptionalText(body.apiToken);

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  let nextClientId = managed.profile.client_id;
  let nextSecret = {
    ciphertext: managed.profile.client_secret_ciphertext,
    iv: managed.profile.client_secret_iv,
    tag: managed.profile.client_secret_tag,
  };

  if (managed.profile.provider_key === "ultimaker") {
    if (apiToken) {
      nextSecret = encryptConnectorSecret(apiToken);
    }
    nextClientId = null;
  } else {
    nextClientId = clientId ?? managed.profile.client_id;

    if (!nextClientId) {
      return jsonError("clientId is required.", 400);
    }

    if (clientSecret) {
      nextSecret = encryptConnectorSecret(clientSecret);
    }
  }

  const updateResult = await supabase
    .from("internal_connector_profiles")
    .update({
      display_name: displayName,
      client_id: nextClientId,
      client_secret_ciphertext: nextSecret.ciphertext,
      client_secret_iv: nextSecret.iv,
      client_secret_tag: nextSecret.tag,
      updated_by_user_id: user.id,
      updated_at: new Date().toISOString(),
      last_test_status: "pending",
      last_test_error: null,
    })
    .eq("id", profileId)
    .select(
      "id, organization_id, provider_key, auth_mode, display_name, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
    )
    .single();

  if (updateResult.error) {
    return jsonError(updateResult.error.message, 500);
  }

  return NextResponse.json({
    profile: {
      id: updateResult.data.id,
      organizationId: updateResult.data.organization_id,
      providerKey: updateResult.data.provider_key,
      authMode: updateResult.data.auth_mode,
      displayName: updateResult.data.display_name,
      clientIdPreview: maskProfilePreview(
        updateResult.data.provider_key,
        updateResult.data.client_id,
      ),
      hasSecret: true,
      lastTestedAt: updateResult.data.last_tested_at,
      lastTestStatus: updateResult.data.last_test_status,
      lastTestError: updateResult.data.last_test_error,
      createdAt: updateResult.data.created_at,
      updatedAt: updateResult.data.updated_at,
    },
  });
}