import Client from "./Client";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function MfaVerifyPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath = resolvedSearchParams.next || "/";

  return <Client nextPath={nextPath} />;
}