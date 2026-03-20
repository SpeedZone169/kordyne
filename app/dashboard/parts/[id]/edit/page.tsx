"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/client";
import Navbar from "../../../../../components/Navbar";
import Footer from "../../../../../components/Footer";
import {
  PART_CATEGORY_OPTIONS,
  PROCESS_TYPE_OPTIONS,
  getPartCategoryLabel,
  getProcessTypeLabel,
} from "@/lib/parts";

type EditPartPageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

type MembershipState = {
  organizationId: string | null;
  role: string | null;
};

type PartState = {
  id: string;
  organization_id: string | null;
  name: string;
  part_number: string | null;
  description: string | null;
  process_type: string | null;
  material: string | null;
  revision: string | null;
  category: string | null;
  status: string | null;
};

export default function EditPartPage({ params }: EditPartPageProps) {
  const router = useRouter();
  const supabase = createClient();

  const [partId, setPartId] = useState<string>("");

  const [membership, setMembership] = useState<MembershipState>({
    organizationId: null,
    role: null,
  });
  const [membershipLoading, setMembershipLoading] = useState(true);

  const [partLoading, setPartLoading] = useState(true);
  const [partNotFound, setPartNotFound] = useState(false);

  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [processType, setProcessType] = useState("");
  const [material, setMaterial] = useState("");
  const [revision, setRevision] = useState("A");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const canEditPart =
    membership.role === "admin" || membership.role === "engineer";

  useEffect(() => {
    async function resolveParamsAndLoad() {
      setError("");
      setMembershipLoading(true);
      setPartLoading(true);

      try {
        const { id } = await params;
        setPartId(id);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) {
          setError(
            `Failed to load organization membership: ${membershipError.message}`
          );
          setMembershipLoading(false);
          setPartLoading(false);
          return;
        }

        const nextMembership = {
          organizationId: membershipData?.organization_id || null,
          role: membershipData?.role || null,
        };

        setMembership(nextMembership);
        setMembershipLoading(false);

        const { data: partData, error: partError } = await supabase
          .from("parts")
          .select(
            "id, organization_id, name, part_number, description, process_type, material, revision, category, status"
          )
          .eq("id", id)
          .single();

        if (partError || !partData) {
          setPartNotFound(true);
          setPartLoading(false);
          return;
        }

        const part = partData as PartState;

        if (
          nextMembership.organizationId &&
          part.organization_id &&
          nextMembership.organizationId !== part.organization_id
        ) {
          setPartNotFound(true);
          setPartLoading(false);
          return;
        }

        setName(part.name || "");
        setPartNumber(part.part_number || "");
        setDescription(part.description || "");
        setProcessType(part.process_type || "");
        setMaterial(part.material || "");
        setRevision(part.revision || "A");
        setCategory(part.category || "");
        setStatus(part.status || "draft");
      } catch {
        setError("Unable to load part details.");
      } finally {
        setMembershipLoading(false);
        setPartLoading(false);
      }
    }

    resolveParamsAndLoad();
  }, [params, router, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!canEditPart) {
      setError("Only engineers and admins can edit parts.");
      setLoading(false);
      return;
    }

    if (!partId) {
      setError("Part not found.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from("parts")
        .update({
          name,
          part_number: partNumber || null,
          description: description || null,
          process_type: processType || null,
          material: material || null,
          revision: revision || null,
          category: category || null,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partId);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess("Part updated.");

      setTimeout(() => {
        router.push(`/dashboard/parts/${partId}`);
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong while updating the part.");
      setLoading(false);
    }
  }

  if (partNotFound) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <Navbar />

        <section className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="text-4xl font-bold">Part not found</h1>
          <p className="mt-4 text-gray-600">
            We could not find this part in your vault.
          </p>

          <div className="mt-8">
            <Link
              href="/dashboard/parts"
              className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Back to Parts Vault
            </Link>
          </div>
        </section>

        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl font-bold">Edit Part</h1>
            <p className="mt-4 text-gray-600">
              Update the part metadata in your vault.
            </p>
          </div>

          {partId ? (
            <Link
              href={`/dashboard/parts/${partId}`}
              className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Back to Part
            </Link>
          ) : null}
        </div>

        {membership.role === "viewer" ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You have read-only access. Only engineers and admins can edit
            parts.
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-10 grid gap-4 rounded-3xl border border-gray-200 p-6 shadow-sm"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">Part Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              required
              disabled={!canEditPart || membershipLoading || partLoading || loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Part Number</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!canEditPart || membershipLoading || partLoading || loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!canEditPart || membershipLoading || partLoading || loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Process Type</label>
              <select
                value={processType}
                onChange={(e) => setProcessType(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canEditPart || membershipLoading || partLoading || loading}
              >
                <option value="">Select process type</option>
                {PROCESS_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getProcessTypeLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Material</label>
              <input
                type="text"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canEditPart || membershipLoading || partLoading || loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Revision</label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canEditPart || membershipLoading || partLoading || loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canEditPart || membershipLoading || partLoading || loading}
              >
                <option value="">Select category</option>
                {PART_CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {getPartCategoryLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canEditPart || membershipLoading || partLoading || loading}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canEditPart || membershipLoading || partLoading || loading}
              className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {membershipLoading || partLoading
                ? "Loading..."
                : loading
                ? "Saving..."
                : "Save Changes"}
            </button>

            {partId ? (
              <Link
                href={`/dashboard/parts/${partId}`}
                className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Cancel
              </Link>
            ) : null}
          </div>

          {success ? <p className="text-sm text-green-700">{success}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </section>

      <Footer />
    </main>
  );
}