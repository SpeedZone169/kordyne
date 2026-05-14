"use client";

import { useRouter } from "next/navigation";
import ShellIcon from "@/components/ShellIcon";
import { createClient } from "@/lib/supabase/client";

export default function ProviderLogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
      title="Log out"
      aria-label="Log out"
    >
      <ShellIcon name="logout" className="h-5 w-5" />
    </button>
  );
}
