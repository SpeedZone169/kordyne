import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Client from "./Client";

const SUPPORTED_PROFILE_PROVIDERS = [
  "fusion",
  "solidworks",
  "inventor",
  "onshape",
] as const;

export default async function DesignConnectorsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    redirect("/dashboard");
  }

  const { data: connectors } = await supabase
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

  const { data: profiles } = await supabase
    .from("internal_connector_profiles")
    .select(
      "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at, token_expires_at",
    )
    .eq("organization_id", membership.organization_id)
    .in("provider_key", [...SUPPORTED_PROFILE_PROVIDERS])
    .order("provider_key", { ascending: true })
    .order("display_name", { ascending: true });

  const { data: recentRuns } = await supabase
    .from("design_sync_runs")
    .select(
      "id, provider_key, run_type, direction, status, started_at, completed_at, design_connector_id",
    )
    .eq("organization_id", membership.organization_id)
    .order("started_at", { ascending: false })
    .limit(20);

  return (
    <Client
      initialConnectors={connectors ?? []}
      initialProfiles={profiles ?? []}
      initialRuns={recentRuns ?? []}
      organizationId={membership.organization_id}
      currentUserId={user.id}
      isOrgAdmin={membership.role === "admin"}
    />
  );
}