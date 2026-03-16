"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type AccountProfileFormProps = {
  userId: string;
  email: string;
  fullName: string;
  company: string;
};

export default function AccountProfileForm({
  userId,
  email,
  fullName,
  company,
}: AccountProfileFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [nameValue, setNameValue] = useState(fullName);
  const [companyValue, setCompanyValue] = useState(company);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      email,
      full_name: nameValue,
      company: companyValue,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Profile updated.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="mt-6 space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Full Name</label>
        <input
          type="text"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Company</label>
        <input
          type="text"
          value={companyValue}
          onChange={(e) => setCompanyValue(e.target.value)}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </form>
  );
}