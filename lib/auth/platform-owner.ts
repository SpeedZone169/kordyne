import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlatformRole =
  | "platform_owner"
  | "platform_admin"
  | "platform_support"
  | "platform_finance"
  | null;

export type CurrentPlatformProfile = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  platform_role: PlatformRole;
};

export async function getCurrentPlatformProfile(): Promise<{
  userId: string | null;
  profile: CurrentPlatformProfile | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      userId: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, company, platform_role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      userId: user.id,
      profile: null,
    };
  }

  return {
    userId: user.id,
    profile: profile as CurrentPlatformProfile,
  };
}

export async function requirePlatformOwner() {
  const { userId, profile } = await getCurrentPlatformProfile();

  if (!userId) {
    redirect("/login");
  }

  if (!profile || profile.platform_role !== "platform_owner") {
    redirect("/dashboard");
  }

  return {
    userId,
    profile,
  };
}