"use client";

import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import ShellIcon from "@/components/ShellIcon";

export default function LogoutButton({
  variant = "rail",
}: {
  variant?: "rail" | "header" | "utility";
}) {
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
      className={
        variant === "header"
          ? "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
          : variant === "utility"
            ? "inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-3 text-xs font-semibold text-white transition hover:border-[#00bdde]/50 hover:bg-[#00bdde]/15"
            : "flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
      }
      title="Log out"
      aria-label="Log out"
    >
      <ShellIcon name="logout" className="h-5 w-5" />
      {variant === "utility" ? <span>Log out</span> : null}
    </button>
  );
}
