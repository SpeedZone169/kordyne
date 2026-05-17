import "server-only";

import { createClient } from "@supabase/supabase-js";

export function createDesignAppAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    const missing = [
      !url ? "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL" : null,
      !serviceRoleKey
        ? "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY"
        : null,
    ].filter(Boolean);

    throw new Error(
      `Missing Supabase admin environment variables: ${missing.join(", ")}.`,
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
