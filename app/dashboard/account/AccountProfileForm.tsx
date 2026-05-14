"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "../../../lib/supabase/client";

type AccountProfileFormProps = {
  userId: string;
  email: string;
  fullName: string;
  company: string;
  position: string;
  phone: string;
  addressLine: string;
  avatarUrl: string;
  preferredTheme: string;
};

export default function AccountProfileForm({
  userId,
  email,
  fullName,
  company,
  position,
  phone,
  addressLine,
  avatarUrl,
  preferredTheme,
}: AccountProfileFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [nameValue, setNameValue] = useState(fullName);
  const [companyValue, setCompanyValue] = useState(company);
  const [positionValue, setPositionValue] = useState(position);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [addressValue, setAddressValue] = useState(addressLine);
  const [avatarValue, setAvatarValue] = useState(avatarUrl);
  const [themeValue, setThemeValue] = useState(
    preferredTheme === "dark" ? "dark" : "light",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const initials =
    nameValue
      .split(" ")
      .map((part: string) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      email,
      full_name: nameValue.trim() || null,
      company: companyValue.trim() || null,
      position: positionValue.trim() || null,
      phone: phoneValue.trim() || null,
      address_line: addressValue.trim() || null,
      avatar_url: avatarValue.trim() || null,
      preferred_theme: themeValue,
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
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col gap-5 rounded-[18px] border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-xl font-bold text-slate-700">
          {avatarValue ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarValue}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Profile picture URL
          </label>
          <input
            type="url"
            value={avatarValue}
            onChange={(e) => setAvatarValue(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            This stores a profile image URL now; secure managed avatar upload can
            use a private storage bucket later.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Full name
          </label>
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Position
          </label>
          <input
            type="text"
            value={positionValue}
            onChange={(e) => setPositionValue(e.target.value)}
            placeholder="Lead design engineer"
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Company
          </label>
          <input
            type="text"
            value={companyValue}
            onChange={(e) => setCompanyValue(e.target.value)}
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Telephone
          </label>
          <input
            type="tel"
            value={phoneValue}
            onChange={(e) => setPhoneValue(e.target.value)}
            placeholder="+353 ..."
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Address
        </label>
        <textarea
          value={addressValue}
          onChange={(e) => setAddressValue(e.target.value)}
          rows={3}
          className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Preferred theme
          </label>
          <select
            value={themeValue}
            onChange={(e) => setThemeValue(e.target.value)}
            className="w-full rounded-[12px] border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <ThemeToggle />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save profile"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}
