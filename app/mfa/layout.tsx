import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function MfaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}