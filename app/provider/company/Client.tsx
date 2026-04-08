"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProviderDashboardData } from "../types";

type Props = {
  data: ProviderDashboardData;
};

export default function Client({ data }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const organization = data.organization;
const canEdit =
  organization &&
  ["admin", "engineer"].includes(organization.memberRole || "");

  const [website, setWebsite] = useState(data.profile?.website ?? "");
  const [phone, setPhone] = useState(data.profile?.phone ?? "");
  const [country, setCountry] = useState(data.profile?.country ?? "");
  const [city, setCity] = useState(data.profile?.city ?? "");
  const [shortDescription, setShortDescription] = useState(
    data.profile?.shortDescription ?? "",
  );
  const [certifications, setCertifications] = useState(
    data.profile?.certifications ?? "",
  );
  const [industriesServed, setIndustriesServed] = useState(
    data.profile?.industriesServed ?? "",
  );
  const [capabilitiesSummary, setCapabilitiesSummary] = useState(
    data.profile?.capabilitiesSummary ?? "",
  );
  const [softwareNotes, setSoftwareNotes] = useState(
    data.profile?.softwareNotes ?? "",
  );

  const [logoPath, setLogoPath] = useState(data.profile?.logoPath ?? "");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(
    data.profile?.logoPublicUrl ?? "",
  );

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const readinessLabel = useMemo(() => {
    const percent = data.stats.profileCompletionPercent;
    if (percent >= 100) return "Complete";
    if (percent >= 70) return "Almost ready";
    if (percent >= 40) return "In progress";
    return "Needs setup";
  }, [data.stats.profileCompletionPercent]);

  async function saveProfile() {
    if (!organization || !canEdit) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const enoughForReady =
        Boolean(logoPath) &&
        Boolean(shortDescription.trim()) &&
        Boolean(website.trim()) &&
        Boolean(country.trim()) &&
        Boolean(phone.trim()) &&
        data.stats.activeCapabilityCount > 0;

      const { error } = await supabase.from("provider_profiles").upsert({
        organization_id: organization.id,
        website: website.trim() || null,
        phone: phone.trim() || null,
        country: country.trim() || null,
        city: city.trim() || null,
        logo_path: logoPath || null,
        short_description: shortDescription.trim() || null,
        certifications: certifications.trim() || null,
        industries_served: industriesServed.trim() || null,
        capabilities_summary: capabilitiesSummary.trim() || null,
        software_notes: softwareNotes.trim() || null,
        onboarding_completed_at: enoughForReady ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setProfileSuccess("Company profile saved.");
      router.refresh();
    } catch (error) {
      setProfileError(
        error instanceof Error ? error.message : "Failed to save provider profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!organization || !canEdit) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoError(null);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "svg";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "svg";
      const filePath = `${organization.id}/logo-${Date.now()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("provider-assets")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const enoughForReady =
        Boolean(filePath) &&
        Boolean(shortDescription.trim()) &&
        Boolean(website.trim()) &&
        Boolean(country.trim()) &&
        Boolean(phone.trim()) &&
        data.stats.activeCapabilityCount > 0;

      const { error: profileUpsertError } = await supabase
        .from("provider_profiles")
        .upsert({
          organization_id: organization.id,
          website: website.trim() || null,
          phone: phone.trim() || null,
          country: country.trim() || null,
          city: city.trim() || null,
          logo_path: filePath,
          short_description: shortDescription.trim() || null,
          certifications: certifications.trim() || null,
          industries_served: industriesServed.trim() || null,
          capabilities_summary: capabilitiesSummary.trim() || null,
          software_notes: softwareNotes.trim() || null,
          onboarding_completed_at: enoughForReady ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      if (profileUpsertError) {
        throw new Error(profileUpsertError.message);
      }

      setProfileSuccess("Logo uploaded and profile updated.");
      router.refresh();
    } catch (error) {
      setLogoError(
        error instanceof Error ? error.message : "Failed to upload logo.",
      );
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Company profile
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Company identity and branding
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Present your company clearly so customers trust the quote source,
              recognize your brand, and understand your manufacturing strengths quickly.
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Profile readiness
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {data.stats.profileCompletionPercent}%
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${data.stats.profileCompletionPercent}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                Status: {readinessLabel}
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                Role: {data.organization?.memberRole || "member"}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              {data.stats.missingItems.length > 0 ? (
                data.stats.missingItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Your company profile is ready for customer-facing quotes.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Profile details
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Provider identity
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Keep company information complete and current so formal quotes,
                invoices, and customer-facing context stay professional.
              </p>
            </div>

            {!canEdit ? (
              <div className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                View only
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Website</label>
              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                disabled={!canEdit}
                placeholder="https://yourcompany.com"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Phone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={!canEdit}
                placeholder="+44 ..."
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Country</label>
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                disabled={!canEdit}
                placeholder="United Kingdom"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">City</label>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                disabled={!canEdit}
                placeholder="Bristol"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Short company description
            </label>
            <textarea
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              disabled={!canEdit}
              rows={4}
              placeholder="Describe your company, strengths, project types, and what makes your team stand out."
              className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Certifications
              </label>
              <textarea
                value={certifications}
                onChange={(event) => setCertifications(event.target.value)}
                disabled={!canEdit}
                rows={4}
                placeholder="ISO 9001, AS9100, internal QA notes..."
                className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Industries served
              </label>
              <textarea
                value={industriesServed}
                onChange={(event) => setIndustriesServed(event.target.value)}
                disabled={!canEdit}
                rows={4}
                placeholder="Aerospace, motorsport, medtech, industrial equipment..."
                className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Capabilities summary
            </label>
            <textarea
              value={capabilitiesSummary}
              onChange={(event) => setCapabilitiesSummary(event.target.value)}
              disabled={!canEdit}
              rows={4}
              placeholder="Summarize your strongest services, ideal work types, and production strengths."
              className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Optional software notes
            </label>
            <textarea
              value={softwareNotes}
              onChange={(event) => setSoftwareNotes(event.target.value)}
              disabled={!canEdit}
              rows={3}
              placeholder="Optional. Add software details only where relevant."
              className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
            />
          </div>

          {profileError ? (
            <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {profileError}
            </div>
          ) : null}

          {profileSuccess ? (
            <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {profileSuccess}
            </div>
          ) : null}

          {canEdit ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSaving ? "Saving..." : "Save company profile"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Branding
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Company logo
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your logo appears on provider-facing branding and formal quotes.
              SVG is supported and works well for crisp display.
            </p>

            <div className="mt-6 rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
              {logoPreviewUrl ? (
                <div className="flex items-center justify-center rounded-[20px] border border-zinc-200 bg-white p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoPreviewUrl}
                    alt="Provider logo"
                    className="max-h-28 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="flex min-h-[140px] items-center justify-center rounded-[20px] border border-dashed border-zinc-300 bg-white px-6 text-center text-sm text-slate-500">
                  No company logo uploaded yet.
                </div>
              )}

              <div className="mt-5 space-y-3">
                <div className="rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Recommended during setup and strongly advised before customer-facing
                  formal quotes.
                </div>

                {canEdit ? (
                  <label className="inline-flex cursor-pointer rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                    {logoUploading ? "Uploading..." : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                    />
                  </label>
                ) : null}

                {logoError ? (
                  <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {logoError}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Commercial presence
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Why this matters
            </h3>
            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
                A clear provider identity builds trust during quote comparison.
              </div>
              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
                Strong branding makes formal quotes and invoices feel client-ready.
              </div>
              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
                Good capability and profile detail improves routing and later scheduling.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}