import Client from "./Client";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function MfaSetupPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = resolvedSearchParams.next || "/";

  return <Client nextPath={nextPath} />;
}