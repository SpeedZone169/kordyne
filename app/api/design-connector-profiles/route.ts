import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

const SUPPORTED_PROFILE_PROVIDERS = [
  "fusion",
  "solidworks",
  "inventor",
  "onshape",
] as const;

const AUTH_MODE_OPTIONS = [
  "oauth_authorization_code",
  "client_credentials",
  "api_token",
] as const;

type SupportedProfileProvider = (typeof SUPPORTED_PROFILE_PROVIDERS)[number];
type SupportedAuthMode = (typeof AUTH_MODE_OPTIONS)[number];

type CreateProfileInput = {
  provider_key: SupportedProfileProvider;
  display_name: string;
  auth_mode: SupportedAuthMode;
  client_id: string | null;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseCreateInput(body: unknown): CreateProfileInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;
  const providerKey = asNullableString(input.provider_key);
  const displayName = asNullableString(input.display_name);
  const authMode = asNullableString(input.auth_mode);
  const clientId = asNullableString(input.client_id);

  if (!providerKey) {
    throw new Error("provider_key is required.");
  }

  if (!SUPPORTED_PROFILE_PROVIDERS.includes(providerKey as SupportedProfileProvider)) {
    throw new Error("Unsupported provider_key.");
  }

  if (!displayName) {
    throw new Error("display_name is required.");
  }

  if (!authMode) {
    throw new Error("auth_mode is required.");
  }

  if (!AUTH_MODE_OPTIONS.includes(authMode as SupportedAuthMode)) {
    throw new Error("Unsupported auth_mode.");
  }

  return {
    provider_key: providerKey as SupportedProfileProvider,
    display_name: displayName,
    auth_mode: authMode as SupportedAuthMode,
    client_id: clientId,
  };
}

export async function GET() {
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

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "No organization membership found." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("internal_connector_profiles")
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at, token_expires_at",
      )
      .eq("organization_id", membership.organization_id)
      .in("provider_key", [...SUPPORTED_PROFILE_PROVIDERS])
      .order("provider_key", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items: data ?? [],
      organization_id: membership.organization_id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected profile error.",
      },
      { status: 500 },
    );
  }
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
    const input = parseCreateInput(body);

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "Only organization admins can create design connector profiles." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("internal_connector_profiles")
      .insert({
        organization_id: membership.organization_id,
        provider_key: input.provider_key,
        display_name: input.display_name,
        auth_mode: input.auth_mode,
        client_id: input.client_id,
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
      })
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at, token_expires_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected profile error.",
      },
      { status: 500 },
    );
  }
}