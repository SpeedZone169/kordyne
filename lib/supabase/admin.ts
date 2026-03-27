import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  console.log(
    "ADMIN ENV CHECK",
    {
      urlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRolePresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    }
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local and restart the dev server."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}