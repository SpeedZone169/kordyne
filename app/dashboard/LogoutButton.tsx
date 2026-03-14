"use client";

import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium hover:bg-gray-50"
    >
      Log out
    </button>
  );
}