import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProviderContext = {
  userId: string;
  membershipOrgIds: string[];
  providerOrgIds: string[];
  primaryProviderOrgId: string | null;
};

export function buildProviderLoginHref(next = "/provider") {
  return `/login?portal=provider&next=${encodeURIComponent(next)}`;
}

export function buildProviderSignupHref(next = "/provider") {
  return `/providers/signup?next=${encodeURIComponent(next)}`;
}

export function isProviderOnlyUser(context: ProviderContext) {
  if (!context.membershipOrgIds.length || !context.providerOrgIds.length) {
    return false;
  }

  const providerSet = new Set(context.providerOrgIds);
  return context.membershipOrgIds.every((orgId) => providerSet.has(orgId));
}

export async function getProviderContext(): Promise<ProviderContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipOrgIds = (memberships ?? []).map((m) => m.organization_id);

  if (membershipOrgIds.length === 0) {
    return {
      userId: user.id,
      membershipOrgIds: [],
      providerOrgIds: [],
      primaryProviderOrgId: null,
    };
  }

  const [{ data: relationshipRows, error: relationshipError }, { data: packageRows, error: packageError }] =
    await Promise.all([
      supabase
        .from("provider_relationships")
        .select("provider_org_id")
        .in("provider_org_id", membershipOrgIds),
      supabase
        .from("provider_request_packages")
        .select("provider_org_id")
        .in("provider_org_id", membershipOrgIds),
    ]);

  if (relationshipError) {
    throw new Error(relationshipError.message);
  }

  if (packageError) {
    throw new Error(packageError.message);
  }

  const providerOrgIds = [
    ...new Set([
      ...(relationshipRows ?? []).map((row) => row.provider_org_id),
      ...(packageRows ?? []).map((row) => row.provider_org_id),
    ]),
  ];

  return {
    userId: user.id,
    membershipOrgIds,
    providerOrgIds,
    primaryProviderOrgId: providerOrgIds[0] ?? null,
  };
}

export async function requireProviderUser(): Promise<ProviderContext> {
  const context = await getProviderContext();

  if (!context) {
    redirect(buildProviderLoginHref("/provider"));
  }

  if (!context.providerOrgIds.length) {
    redirect("/providers");
  }

  return context;
}