import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

type DesignAppAccessOptions = {
  providerKey?: string;
  allowedRoles?: string[];
  requireEntitlement?: boolean;
};

export function extractDesignAppToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  const directHeader = request.headers.get("x-kordyne-connection-token");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  if (directHeader && directHeader.trim().length > 0) {
    return directHeader.trim();
  }

  return null;
}

export function createTokenBoundClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getDesignAppRequestContext(
  request: Request,
  options: DesignAppAccessOptions = {},
) {
  const providerKey = options.providerKey ?? "fusion";
  const requireEntitlement = options.requireEntitlement ?? true;
  const defaultAllowedRoles = options.allowedRoles ?? ["admin", "engineer"];

  const token = extractDesignAppToken(request);

  const supabase = token ? createTokenBoundClient(token) : await createClient();

  const authResult = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  const {
    data: { user },
    error: userError,
  } = authResult;

  if (userError || !user) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: userError?.message ?? "Unauthorized.",
          debug: {
            token_present: Boolean(token),
            auth_mode: token ? "token" : "cookie",
          },
        },
        { status: 401 },
      ),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: membershipError.message,
        },
        { status: 500 },
      ),
    };
  }

  if (!membership?.organization_id) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "No organization membership found.",
        },
        { status: 403 },
      ),
    };
  }

  let entitlement:
    | {
        id: string;
        organization_id: string;
        provider_key: string;
        is_enabled: boolean;
        allowed_runtime_roles: string[] | null;
        current_release_id: string | null;
      }
    | null = null;

  if (requireEntitlement) {
    const { data, error: entitlementError } = await supabase
      .from("organization_connector_entitlements")
      .select(
        "id, organization_id, provider_key, is_enabled, allowed_runtime_roles, current_release_id",
      )
      .eq("organization_id", membership.organization_id)
      .eq("provider_key", providerKey)
      .maybeSingle();

    if (entitlementError) {
      return {
        error: NextResponse.json(
          {
            ok: false,
            error: entitlementError.message,
          },
          { status: 500 },
        ),
      };
    }

    entitlement = data;

    if (!entitlement?.is_enabled) {
      return {
        error: NextResponse.json(
          {
            ok: false,
            error: "Connector is not enabled for this organization.",
          },
          { status: 403 },
        ),
      };
    }

    const effectiveAllowedRoles =
      Array.isArray(entitlement.allowed_runtime_roles) &&
      entitlement.allowed_runtime_roles.length > 0
        ? entitlement.allowed_runtime_roles
        : defaultAllowedRoles;

    if (!effectiveAllowedRoles.includes(membership.role)) {
      return {
        error: NextResponse.json(
          {
            ok: false,
            error: "You do not have access to this connector.",
          },
          { status: 403 },
        ),
      };
    }
  } else if (!defaultAllowedRoles.includes(membership.role)) {
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: "You do not have access to this route.",
        },
        { status: 403 },
      ),
    };
  }

  return {
    token,
    supabase,
    user,
    organizationId: membership.organization_id,
    role: membership.role,
    membership,
    entitlement,
    providerKey,
  };
}