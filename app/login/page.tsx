import Client from "./Client";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

type PortalMode = "customer" | "provider" | "admin";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
    portal?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const portal: PortalMode =
    resolvedSearchParams.portal === "admin"
      ? "admin"
      : resolvedSearchParams.portal === "provider"
        ? "provider"
        : "customer";

  const fallback =
    portal === "admin"
      ? "/admin"
      : portal === "provider"
        ? "/provider"
        : "/dashboard";
  const nextPath = getSafeRedirectPath(resolvedSearchParams.next, fallback);

  return <Client nextPath={nextPath} portal={portal} />;
}
