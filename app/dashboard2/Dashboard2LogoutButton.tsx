"use client";

import { useRouter } from "next/navigation";
import ShellIcon from "@/components/ShellIcon";
import { createClient } from "@/lib/supabase/client";

export default function Dashboard2LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-3 text-[12px] font-semibold text-white/82 backdrop-blur transition hover:border-[#00bdde]/50 hover:bg-[#00bdde]/14 hover:text-white"
    >
      <ShellIcon name="logout" className="h-4 w-4" />
      <span className="hidden lg:inline">Log out</span>
    </button>
  );
}
