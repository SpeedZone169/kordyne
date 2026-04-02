import { createClient } from "@/lib/supabase/server";

export async function getProviderAssetSignedUrl(
  path: string,
  expiresIn = 60 * 10,
): Promise<string | null> {
  if (!path) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("provider-assets")
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to create provider asset signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

export async function getProviderInvoiceSignedUrl(
  path: string,
  expiresIn = 60 * 10,
): Promise<string | null> {
  if (!path) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("provider-invoices")
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to create provider invoice signed URL:", error);
    return null;
  }

  return data.signedUrl;
}