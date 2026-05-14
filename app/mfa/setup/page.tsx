import Client from "./Client";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function MfaSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = getSafeRedirectPath(resolvedSearchParams.next, "/dashboard");

  return <Client nextPath={nextPath} />;
}
