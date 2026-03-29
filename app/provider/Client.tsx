"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrencyValue,
  formatLeadTime,
  getProviderPackageStatusLabel,
  getProviderQuoteStatusLabel,
  providerPackageStatusTones,
  providerQuoteStatusTones,
} from "@/lib/providers";
import type { ProviderDashboardData } from "./types";

type Props = {
  data: ProviderDashboardData;
};

const PROCESS_OPTIONS = [
  { value: "cnc_machining", label: "CNC machining" },
  { value: "3d_printing", label: "3D printing" },
  { value: "sheet_metal", label: "Sheet metal" },
  { value: "composite_manufacturing", label: "Composite manufacturing" },
  { value: "injection_moulding", label: "Injection moulding" },
  { value: "3d_scanning", label: "3D scanning" },
  { value: "ct_scanning", label: "CT scanning" },
  { value: "cad_creation", label: "CAD creation" },
] as const;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toneClasses(
  tone: "neutral" | "info" | "success" | "warning" | "danger",
) {
  switch (tone) {
    case "info":
      return "bg-sky-100 text-sky-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "danger":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getProcessLabel(value: string) {
  return PROCESS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

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

  const [processFamily, setProcessFamily] = useState<string>("cnc_machining");
  const [processName, setProcessName] = useState("");
  const [materialFamily, setMaterialFamily] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [certification, setCertification] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [leadTimeNotes, setLeadTimeNotes] = useState("");

  const [capabilitySaving, setCapabilitySaving] = useState(false);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilitySuccess, setCapabilitySuccess] = useState<string | null>(null);
  const [capabilityBusyId, setCapabilityBusyId] = useState<string | null>(null);

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

      setProfileSuccess("Provider profile saved.");
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
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "png";
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

      const publicUrl = supabase.storage
        .from("provider-assets")
        .getPublicUrl(filePath).data.publicUrl;

      setLogoPath(filePath);
      setLogoPreviewUrl(publicUrl);

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

      router.refresh();
    } catch (error) {
      setLogoError(
        error instanceof Error ? error.message : "Failed to upload logo.",
      );
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleAddCapability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organization || !canEdit) return;

    if (!processName.trim()) {
      setCapabilityError("Capability name is required.");
      return;
    }

    setCapabilitySaving(true);
    setCapabilityError(null);
    setCapabilitySuccess(null);

    try {
      const { error } = await supabase.from("provider_capabilities").insert({
        provider_org_id: organization.id,
        process_family: processFamily,
        process_name: processName.trim(),
        material_family: materialFamily.trim() || null,
        material_name: materialName.trim() || null,
        machine_type: machineType.trim() || null,
        certification: certification.trim() || null,
        min_quantity: minQuantity ? Number(minQuantity) : null,
        max_quantity: maxQuantity ? Number(maxQuantity) : null,
        lead_time_notes: leadTimeNotes.trim() || null,
        active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setCapabilitySuccess("Capability added.");
      setProcessFamily("cnc_machining");
      setProcessName("");
      setMaterialFamily("");
      setMaterialName("");
      setMachineType("");
      setCertification("");
      setMinQuantity("");
      setMaxQuantity("");
      setLeadTimeNotes("");

      router.refresh();
    } catch (error) {
      setCapabilityError(
        error instanceof Error ? error.message : "Failed to add capability.",
      );
    } finally {
      setCapabilitySaving(false);
    }
  }

  async function toggleCapability(capabilityId: string, nextActive: boolean) {
    if (!canEdit) return;

    setCapabilityBusyId(capabilityId);
    setCapabilityError(null);
    setCapabilitySuccess(null);

    try {
      const { error } = await supabase
        .from("provider_capabilities")
        .update({
          active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", capabilityId);

      if (error) {
        throw new Error(error.message);
      }

      router.refresh();
    } catch (error) {
      setCapabilityError(
        error instanceof Error ? error.message : "Failed to update capability.",
      );
    } finally {
      setCapabilityBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Provider workspace
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              {organization?.name || "Provider dashboard"}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Build a trusted provider profile, present your capabilities clearly,
              and manage incoming customer quote opportunities from one place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Role: {organization?.memberRole || "member"}
              </span>
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Profile readiness: {readinessLabel}
              </span>
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Active capabilities: {data.stats.activeCapabilityCount}
              </span>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Quote readiness
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

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Complete your branding and capabilities so your formal quotes look
              professional and customers can quickly understand what your company can deliver.
            </p>

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
                  Your provider profile is ready for customer-facing quotes.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Company profile
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Provider identity
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Present your company clearly so customers trust the quote source,
                understand your manufacturing strengths, and can recognize your brand immediately.
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
              placeholder="Describe your company, strengths, typical project types, and what makes your team stand out."
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
              placeholder="Summarise your strongest capabilities, ideal work types, and production strengths."
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
              placeholder="Optional. Only add software details if relevant for CAD creation, 3D scanning, or CT scanning."
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
                {profileSaving ? "Saving..." : "Save provider profile"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Branding
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Company logo
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your logo is used on formal quotes and provider-facing branding in Kordyne.
              This helps customers quickly recognise your company, builds trust during quote
              comparison, and makes your documents look professional.
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
                  Recommended during setup. Required before sending customer-facing formal quotes.
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
              Live activity
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Provider inbox snapshot
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <p className="text-sm text-slate-500">Packages</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.packageCount}
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <p className="text-sm text-slate-500">Awaiting response</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.awaitingResponseCount}
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <p className="text-sm text-slate-500">Responded</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.respondedCount}
                </p>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <p className="text-sm text-slate-500">Awarded</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.awardedCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Manufacturing capabilities
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Capability register
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Add the processes, machines, materials, and production ranges your company supports.
              This becomes the foundation for better routing now and better scheduling later.
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-4 py-2 text-sm font-medium text-slate-700">
            {data.stats.activeCapabilityCount} active capabilities
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <h3 className="text-lg font-semibold text-slate-950">
              Add capability
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Keep this structured. Focus on services, machine capability, material range,
              and quantity range. Software is optional and only needed where it truly matters.
            </p>

            <form onSubmit={handleAddCapability} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Service category
                </label>
                <select
                  value={processFamily}
                  onChange={(event) => setProcessFamily(event.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                >
                  {PROCESS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Capability name
                </label>
                <input
                  value={processName}
                  onChange={(event) => setProcessName(event.target.value)}
                  disabled={!canEdit}
                  placeholder="5-axis CNC, SLA printing, CT scanning, CAD creation..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Material family
                  </label>
                  <input
                    value={materialFamily}
                    onChange={(event) => setMaterialFamily(event.target.value)}
                    disabled={!canEdit}
                    placeholder="Aluminium, polymer, composite..."
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Material name
                  </label>
                  <input
                    value={materialName}
                    onChange={(event) => setMaterialName(event.target.value)}
                    disabled={!canEdit}
                    placeholder="7075, PA12, carbon fibre..."
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Machine / equipment
                  </label>
                  <input
                    value={machineType}
                    onChange={(event) => setMachineType(event.target.value)}
                    disabled={!canEdit}
                    placeholder="Roeders 5-axis, Formlabs Form 4L..."
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Certification
                  </label>
                  <input
                    value={certification}
                    onChange={(event) => setCertification(event.target.value)}
                    disabled={!canEdit}
                    placeholder="ISO 9001, internal QA, N/A..."
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Min quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minQuantity}
                    onChange={(event) => setMinQuantity(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Max quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxQuantity}
                    onChange={(event) => setMaxQuantity(event.target.value)}
                    disabled={!canEdit}
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Lead time notes
                </label>
                <textarea
                  value={leadTimeNotes}
                  onChange={(event) => setLeadTimeNotes(event.target.value)}
                  disabled={!canEdit}
                  rows={4}
                  placeholder="Typical turnaround, setup considerations, shift capacity, or throughput notes."
                  className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>

              {capabilityError ? (
                <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {capabilityError}
                </div>
              ) : null}

              {capabilitySuccess ? (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {capabilitySuccess}
                </div>
              ) : null}

              {canEdit ? (
                <button
                  type="submit"
                  disabled={capabilitySaving}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {capabilitySaving ? "Adding..." : "Add capability"}
                </button>
              ) : null}
            </form>
          </div>

          <div>
            {data.capabilities.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-zinc-300 bg-[#fafaf9] p-8 text-sm text-slate-600">
                No capabilities added yet. Start by adding your core processes such as CNC machining,
                3D printing, sheet metal, composites, scanning, or CAD creation.
              </div>
            ) : (
              <div className="space-y-4">
                {data.capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="rounded-[28px] border border-zinc-200 bg-white p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">
                            {capability.processName}
                          </h3>

                          <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                            {getProcessLabel(capability.processFamily)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              capability.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-zinc-200 text-zinc-700"
                            }`}
                          >
                            {capability.active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-600">
                          <p>
                            Machine / equipment: {capability.machineType || "—"}
                          </p>
                          <p>
                            Material family: {capability.materialFamily || "—"}
                          </p>
                          <p>
                            Material name: {capability.materialName || "—"}
                          </p>
                          <p>
                            Certification: {capability.certification || "—"}
                          </p>
                          <p>
                            Quantity range:{" "}
                            {capability.minQuantity ?? "—"} to{" "}
                            {capability.maxQuantity ?? "—"}
                          </p>
                          <p>
                            Lead time notes: {capability.leadTimeNotes || "—"}
                          </p>
                        </div>
                      </div>

                      {canEdit ? (
                        <button
                          type="button"
                          disabled={capabilityBusyId === capability.id}
                          onClick={() =>
                            toggleCapability(capability.id, !capability.active)
                          }
                          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {capabilityBusyId === capability.id
                            ? "Saving..."
                            : capability.active
                              ? "Deactivate"
                              : "Reactivate"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Customer opportunities
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Provider inbox
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Monitor customer packages, review your quote state, and open each opportunity to respond.
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-4 py-2 text-sm font-medium text-slate-700">
            Latest submitted quotes: {data.stats.latestSubmittedQuoteCount}
          </div>
        </div>

        {data.rows.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
            No provider packages have been published to this organization yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {data.rows.map((row) => (
              <div
                key={row.packageId}
                className="rounded-[28px] border border-zinc-200 bg-white p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {row.packageTitle || "Provider package"}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                            providerPackageStatusTones[
                              row.packageStatus as keyof typeof providerPackageStatusTones
                            ],
                          )}`}
                        >
                          {getProviderPackageStatusLabel(
                            row.packageStatus as Parameters<
                              typeof getProviderPackageStatusLabel
                            >[0],
                          )}
                        </span>

                        {row.latestQuoteStatus ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                              providerQuoteStatusTones[
                                row.latestQuoteStatus as keyof typeof providerQuoteStatusTones
                              ],
                            )}`}
                          >
                            {getProviderQuoteStatusLabel(
                              row.latestQuoteStatus as Parameters<
                                typeof getProviderQuoteStatusLabel
                              >[0],
                            )}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Customer: {row.customerOrgName}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>Response deadline: {formatDateTime(row.responseDeadline)}</p>
                      <p>Target due date: {formatDate(row.targetDueDate)}</p>
                      <p>Requested quantity: {row.requestedQuantity ?? "—"}</p>
                      <p>Customer-visible status: {row.customerVisibleStatus || "—"}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Latest total</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatCurrencyValue(
  row.latestTotalPrice,
  row.latestCurrencyCode ?? undefined,
)}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Lead time</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatLeadTime(row.latestLeadTimeDays)}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Published</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(row.publishedAt)}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Awarded</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(row.awardedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/provider/requests/${row.packageId}`}
                    className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Open package
                  </Link>

                  {row.latestQuoteVersion ? (
                    <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-4 py-2 text-sm font-medium text-slate-700">
                      Latest quote version: v{row.latestQuoteVersion}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}