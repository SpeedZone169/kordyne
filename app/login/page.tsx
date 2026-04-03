import Client from "./Client";

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

  const nextPath =
    resolvedSearchParams.next ||
    (portal === "admin"
      ? "/admin"
      : portal === "provider"
        ? "/provider"
        : "/dashboard");

  return <Client nextPath={nextPath} portal={portal} />;
}