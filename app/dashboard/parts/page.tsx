import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";

type PartsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    process?: string;
    material?: string;
  }>;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "archived":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-gray-900 text-white";
    case "engineer":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function PartsPage({ searchParams }: PartsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");
  const canCreatePart = orgRole === "admin" || orgRole === "engineer";

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryText = resolvedSearchParams.q?.trim() || "";
  const statusFilter = resolvedSearchParams.status?.trim() || "";
  const processFilter = resolvedSearchParams.process?.trim() || "";
  const materialFilter = resolvedSearchParams.material?.trim() || "";

  let query = supabase
    .from("parts")
    .select("*")
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.or(
      `name.ilike.%${queryText}%,part_number.ilike.%${queryText}%`
    );
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (processFilter) {
    query = query.eq("process_type", processFilter);
  }

  if (materialFilter) {
    query = query.eq("material", materialFilter);
  }

  const { data: parts, error } = await query;

  const { data: allPartsForFilters } = await supabase
    .from("parts")
    .select("status, process_type, material");

  const statusOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.status)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const processOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.process_type)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const materialOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.material)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Parts Vault</h1>
            <p className="mt-4 text-gray-600">
              Manage your parts, metadata, and manufacturing assets.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                  orgRole
                )}`}
              >
                {orgRole || "unknown"}
              </span>

              {!canCreatePart ? (
                <p className="text-sm text-gray-500">
                  Read-only access. Viewers can browse parts but cannot create
                  or edit them.
                </p>
              ) : null}
            </div>
          </div>

          {canCreatePart ? (
            <Link
              href="/dashboard/parts/new"
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              New Part
            </Link>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">Search</label>
              <input
                type="text"
                name="q"
                defaultValue={queryText}
                placeholder="Search by part name or part number"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Process</label>
              <select
                name="process"
                defaultValue={processFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {processOptions.map((process) => (
                  <option key={process} value={process}>
                    {process}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Material</label>
              <select
                name="material"
                defaultValue={materialFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Apply Filters
              </button>

              <Link
                href="/dashboard/parts"
                className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Clear
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Part Number</th>
                <th className="px-6 py-4 font-medium">Process</th>
                <th className="px-6 py-4 font-medium">Material</th>
                <th className="px-6 py-4 font-medium">Revision</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {parts && parts.length > 0 ? (
                parts.map((part) => (
                  <tr key={part.id} className="border-t border-gray-200">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/parts/${part.id}`}
                        className="font-medium text-green-700 hover:text-green-800 hover:underline"
                      >
                        {part.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{part.part_number || "-"}</td>
                    <td className="px-6 py-4">{part.process_type || "-"}</td>
                    <td className="px-6 py-4">{part.material || "-"}</td>
                    <td className="px-6 py-4">{part.revision || "-"}</td>
                    <td className="px-6 py-4">
                      {part.status ? (
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                            part.status
                          )}`}
                        >
                          {part.status}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(part.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-gray-500">
                    No parts found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600">Failed to load parts.</p>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}