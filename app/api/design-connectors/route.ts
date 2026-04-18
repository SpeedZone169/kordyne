import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import type {
  CreateDesignConnectorInput,
  DesignConnectionMode,
  DesignConnectorProvider,
  DesignSyncScopeType,
} from "../../../lib/design-connectors/types";

type ConnectorInsertRow = {
  organization_id: string;
  provider_key: DesignConnectorProvider;
  credential_profile_id: string;
  display_name: string;
  connection_mode: DesignConnectionMode;
  sync_scope_type: DesignSyncScopeType;
  sync_scope_external_id: string | null;
  sync_scope_label: string | null;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseCreateInput(body: unknown): CreateDesignConnectorInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;

  if (typeof input.provider_key !== "string" || input.provider_key.trim().length === 0) {
    throw new Error("provider_key is required.");
  }

  if (
    typeof input.credential_profile_id !== "string" ||
    input.credential_profile_id.trim().length === 0
  ) {
    throw new Error("credential_profile_id is required.");
  }

  if (typeof input.display_name !== "string" || input.display_name.trim().length === 0) {
    throw new Error("display_name is required.");
  }

  if (typeof input.sync_scope_type !== "string" || input.sync_scope_type.trim().length === 0) {
    throw new Error("sync_scope_type is required.");
  }

  return {
    provider_key: input.provider_key.trim() as DesignConnectorProvider,
    credential_profile_id: input.credential_profile_id.trim(),
    display_name: input.display_name.trim(),
    connection_mode:
      (typeof input.connection_mode === "string"
        ? input.connection_mode.trim()
        : "bidirectional") as DesignConnectionMode,
    sync_scope_type: input.sync_scope_type.trim() as DesignSyncScopeType,
    sync_scope_external_id: toNullableString(input.sync_scope_external_id),
    sync_scope_label: toNullableString(input.sync_scope_label),
    is_enabled: typeof input.is_enabled === "boolean" ? input.is_enabled : true,
    settings: toObject(input.settings),
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
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json({ error: "No organization membership found." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("design_connectors")
      .select(
        `
          *,
          credential_profile:internal_connector_profiles (
            id,
            display_name,
            provider_key,
            auth_mode,
            last_test_status
          )
        `,
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false });

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
        error: error instanceof Error ? error.message : "Unexpected error.",
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
        { error: "Only organization admins can create design connectors." },
        { status: 403 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("id, organization_id, provider_key, display_name")
      .eq("id", input.credential_profile_id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: "Credential profile not found." }, { status: 404 });
    }

    if (profile.organization_id !== membership.organization_id) {
      return NextResponse.json(
        { error: "Credential profile does not belong to your organization." },
        { status: 403 },
      );
    }

    if (profile.provider_key !== input.provider_key) {
      return NextResponse.json(
        { error: "Provider key must match the selected credential profile." },
        { status: 400 },
      );
    }

    const row: ConnectorInsertRow = {
      organization_id: membership.organization_id,
      provider_key: input.provider_key,
      credential_profile_id: input.credential_profile_id,
      display_name: input.display_name,
      connection_mode: input.connection_mode ?? "bidirectional",
      sync_scope_type: input.sync_scope_type,
      sync_scope_external_id: input.sync_scope_external_id ?? null,
      sync_scope_label: input.sync_scope_label ?? null,
      is_enabled: input.is_enabled ?? true,
      settings: input.settings ?? {},
      created_by_user_id: user.id,
      updated_by_user_id: user.id,
    };

    const { data, error } = await supabase
      .from("design_connectors")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}