import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function enforceMfaOrRedirect(nextPath: string) {
  const supabase = await createClient();

  const aalResult = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalResult.error) {
    throw new Error(aalResult.error.message);
  }

  if (aalResult.data.currentLevel === "aal2") {
    return;
  }

  const factorsResult = await supabase.auth.mfa.listFactors();
  if (factorsResult.error) {
    throw new Error(factorsResult.error.message);
  }

  const hasTotp = (factorsResult.data.totp?.length ?? 0) > 0;

  if (hasTotp) {
    redirect(`/mfa/verify?next=${encodeURIComponent(nextPath)}`);
  }

  redirect(`/mfa/setup?next=${encodeURIComponent(nextPath)}`);
}