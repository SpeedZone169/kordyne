"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import {
  PART_CATEGORY_OPTIONS,
  PROCESS_TYPE_OPTIONS,
  getPartCategoryLabel,
  getProcessTypeLabel,
} from "@/lib/parts";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

const REVISION_SCHEME_OPTIONS = [
  { value: "alphabetic", label: "Alphabetic (A, B, C...)" },
  { value: "numeric", label: "Numeric (1, 2, 3...)" },
] as const;

type RevisionScheme = "alphabetic" | "numeric";

type MembershipState = {
  organizationId: string | null;
  role: string | null;
};

function getInitialRevisionLabel(revisionScheme: RevisionScheme) {
  return revisionScheme === "numeric" ? "1" : "A";
}

export default function NewPartPage() {
  const router = useRouter();
  const supabase = createClient();

  const [membership, setMembership] = useState<MembershipState>({
    organizationId: null,
    role: null,
  });
  const [membershipLoading, setMembershipLoading] = useState(true);

  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [processType, setProcessType] = useState("");
  const [material, setMaterial] = useState("");
  const [revisionScheme, setRevisionScheme] =
    useState<RevisionScheme>("alphabetic");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canCreatePart =
    membership.role === "admin" || membership.role === "engineer";

  const initialRevisionLabel = useMemo(
    () => getInitialRevisionLabel(revisionScheme),
    [revisionScheme]
  );

  useEffect(() => {
    async function loadMembership() {
      setMembershipLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("organization_members")
          .select("organization_id, role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          setError(`Failed to load organization membership: ${error.message}`);
          setMembershipLoading(false);
          return;
        }

        setMembership({
          organizationId: data?.organization_id || null,
          role: data?.role || null,
        });
      } catch {
        setError("Unable to load your organization membership.");
      } finally {
        setMembershipLoading(false);
      }
    }

    loadMembership();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!canCreatePart) {
      setError("Only engineers and admins can create parts.");
      setLoading(false);
      return;
    }

    if (!membership.organizationId) {
      setError("No organization found for your account.");
      setLoading(false);
      return;
    }

    const trimmedName = name.trim();
    const trimmedPartNumber = partNumber.trim();
    const trimmedDescription = description.trim();
    const trimmedMaterial = material.trim();

    if (!trimmedName) {
      setError("Part name is required.");
      setLoading(false);
      return;
    }

    try {
      const { data: newPartId, error: createError } = await supabase.rpc(
        "create_part_with_family",
        {
          p_name: trimmedName,
          p_part_number: trimmedPartNumber || null,
          p_description: trimmedDescription || null,
          p_process_type: processType || null,
          p_material: trimmedMaterial || null,
          p_revision_scheme: revisionScheme,
          p_category: category || null,
          p_status: status,
        }
      );

      if (createError || !newPartId) {
        setError(createError?.message || "Failed to create part.");
        setLoading(false);
        return;
      }

      router.push(`/dashboard/parts/${newPartId}`);
      router.refresh();
    } catch {
      setError("Something went wrong while creating the part.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">Create New Part</h1>
        <p className="mt-4 text-gray-600">
          Add a new part record to your vault. A new part family will be created
          automatically and the first revision will be assigned by the selected
          revision scheme.
        </p>

        {membership.role === "viewer" ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You have read-only access. Only engineers and admins can create
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
              disabled={!canCreatePart || membershipLoading || loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Part Number</label>
            <input
              type="text"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!canCreatePart || membershipLoading || loading}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!canCreatePart || membershipLoading || loading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Process Type</label>
              <select
                value={processType}
                onChange={(e) => setProcessType(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canCreatePart || membershipLoading || loading}
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
                disabled={!canCreatePart || membershipLoading || loading}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Revision Scheme
              </label>
              <select
                value={revisionScheme}
                onChange={(e) =>
                  setRevisionScheme(e.target.value as RevisionScheme)
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canCreatePart || membershipLoading || loading}
              >
                {REVISION_SCHEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Initial Revision
              </label>
              <div className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900">
                {initialRevisionLabel}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canCreatePart || membershipLoading || loading}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
              disabled={!canCreatePart || membershipLoading || loading}
            >
              <option value="">Select category</option>
              {PART_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {getPartCategoryLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={!canCreatePart || membershipLoading || loading}
            className="mt-4 rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {membershipLoading
              ? "Loading access..."
              : loading
              ? "Creating..."
              : "Create Part"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
      </section>

      <Footer />
    </main>
  );
}