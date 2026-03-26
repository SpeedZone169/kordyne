import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getProviderContext, isProviderOnlyUser } from "@/lib/auth/provider-access";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const providerContext = await getProviderContext();

  if (providerContext && isProviderOnlyUser(providerContext)) {
    redirect("/provider");
  }

  return <>{children}</>;
}