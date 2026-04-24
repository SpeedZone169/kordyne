import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const AUTH_MODE_OPTIONS = [
  "oauth_authorization_code",
  "client_credentials",
  "api_token",
] as const;

type SupportedAuthMode = (typeof AUTH_MODE_OPTIONS)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateProfileInput = {
  display_name?: string;
  auth_mode?: SupportedAuthMode;
  client_id?: string | null;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function parseUpdateInput(body: unknown): UpdateProfileInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;
  const parsed: UpdateProfileInput = {};

  if ("display_name" in input) {
    const displayName = asNullableString(input.display_name);
    if (!displayName) {
      throw new Error("display_name cannot be empty.");
    }
    parsed.display_name = displayName;
  }

  if ("auth_mode" in input) {
    const authMode = asNullableString(input.auth_mode);
    if (!authMode) {
      throw new Error("auth_mode cannot be empty.");
    }

    if (!AUTH_MODE_OPTIONS.includes(authMode as SupportedAuthMode)) {
      throw new Error("Unsupported auth_mode.");
    }

    parsed.auth_mode = authMode as SupportedAuthMode;
  }

  if ("client_id" in input) {
    parsed.client_id = asNullableString(input.client_id);
  }

  return parsed;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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
    const input = parseUpdateInput(body);

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided." },
        { status: 400 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("id, organization_id")
      .eq("id", id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", profile.organization_id)
      .eq("role", "admin")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "Only organization admins can update design connector profiles." },
        { status: 403 },
      );
    }

    const { data, error } = await supabase
      .from("internal_connector_profiles")
      .update({
        ...input,
        updated_by_user_id: user.id,
      })
      .eq("id", id)
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at, token_expires_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const { data: profile, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("id, organization_id, display_name")
      .eq("id", id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", profile.organization_id)
      .eq("role", "admin")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "Only organization admins can delete design connector profiles." },
        { status: 403 },
      );
    }

    const { count, error: usageError } = await supabase
      .from("design_connectors")
      .select("*", { count: "exact", head: true })
      .eq("credential_profile_id", id);

    if (usageError) {
      return NextResponse.json({ error: usageError.message }, { status: 500 });
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "This profile is currently used by one or more design connectors. Remove or reassign those connectors first.",
        },
        { status: 409 },
      );
    }

    const { error } = await supabase
      .from("internal_connector_profiles")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `Deleted profile '${profile.display_name}'.`,
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