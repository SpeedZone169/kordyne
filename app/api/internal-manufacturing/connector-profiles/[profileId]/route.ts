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

function maskClientId(clientId: string) {
  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}••••${clientId.slice(-2)}`;
  }

  return `${clientId.slice(0, 4)}••••••${clientId.slice(-4)}`;
}

function maskApiToken(token: string) {
  if (token.length <= 8) {
    return `${token.slice(0, 2)}••••${token.slice(-2)}`;
  }

  return `${token.slice(0, 4)}••••••${token.slice(-4)}`;
}

async function getManagedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string,
) {
  const profileResult = await supabase
    .from("internal_connector_profiles")
    .select(
      "id, organization_id, provider_key, display_name, auth_mode, client_id, client_secret_ciphertext, client_secret_iv, client_secret_tag, access_token_ciphertext, access_token_iv, access_token_tag, refresh_token_ciphertext, refresh_token_iv, refresh_token_tag, token_expires_at, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
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

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  if (managed.profile.provider_key === "formlabs") {
    const clientId =
      normalizeOptionalText(body.clientId) ?? managed.profile.client_id;
    const clientSecret = normalizeOptionalText(body.clientSecret);

    if (!clientId) {
      return jsonError("clientId is required.", 400);
    }

    const secretUpdate = clientSecret
      ? encryptConnectorSecret(clientSecret)
      : {
          ciphertext: managed.profile.client_secret_ciphertext,
          iv: managed.profile.client_secret_iv,
          tag: managed.profile.client_secret_tag,
        };

    const updateResult = await supabase
      .from("internal_connector_profiles")
      .update({
        display_name: displayName,
        auth_mode: "client_credentials",
        client_id: clientId,
        client_secret_ciphertext: secretUpdate.ciphertext,
        client_secret_iv: secretUpdate.iv,
        client_secret_tag: secretUpdate.tag,
        updated_by_user_id: user.id,
        updated_at: new Date().toISOString(),
        last_test_status: "pending",
        last_test_error: null,
      })
      .eq("id", profileId)
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
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
        clientIdPreview: maskClientId(updateResult.data.client_id),
        hasSecret: true,
        lastTestedAt: updateResult.data.last_tested_at,
        lastTestStatus: updateResult.data.last_test_status,
        lastTestError: updateResult.data.last_test_error,
        createdAt: updateResult.data.created_at,
        updatedAt: updateResult.data.updated_at,
      },
    });
  }

  if (managed.profile.provider_key === "ultimaker") {
    const apiToken = normalizeOptionalText(body.apiToken);

    const encryptedToken = apiToken
      ? encryptConnectorSecret(apiToken)
      : {
          ciphertext: managed.profile.access_token_ciphertext,
          iv: managed.profile.access_token_iv,
          tag: managed.profile.access_token_tag,
        };

    const updateResult = await supabase
      .from("internal_connector_profiles")
      .update({
        display_name: displayName,
        auth_mode: "api_token",
        access_token_ciphertext: encryptedToken.ciphertext,
        access_token_iv: encryptedToken.iv,
        access_token_tag: encryptedToken.tag,
        updated_by_user_id: user.id,
        updated_at: new Date().toISOString(),
        last_test_status: "pending",
        last_test_error: null,
      })
      .eq("id", profileId)
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
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
        clientIdPreview: apiToken
          ? maskApiToken(apiToken)
          : "Saved API token",
        hasSecret: true,
        lastTestedAt: updateResult.data.last_tested_at,
        lastTestStatus: updateResult.data.last_test_status,
        lastTestError: updateResult.data.last_test_error,
        createdAt: updateResult.data.created_at,
        updatedAt: updateResult.data.updated_at,
      },
    });
  }

  return jsonError(
    `Credential profile update is not implemented for provider "${managed.profile.provider_key}" yet.`,
    400,
  );
}