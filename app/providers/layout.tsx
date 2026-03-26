import type { ReactNode } from "react";
import ProviderPublicFooter from "@/components/providers/ProviderPublicFooter";
import ProviderPublicHeader from "@/components/providers/ProviderPublicHeader";

export default function ProvidersPublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <ProviderPublicHeader />
      <main>{children}</main>
      <ProviderPublicFooter />
    </div>
  );
}