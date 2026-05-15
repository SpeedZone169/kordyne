import { redirect } from "next/navigation";
import { buildProviderLoginHref } from "@/lib/auth/provider-access";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function ProviderLoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const next = resolvedSearchParams.next || "/provider";

  redirect(buildProviderLoginHref(next));
}
