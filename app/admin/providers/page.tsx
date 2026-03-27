import { requirePlatformOwner } from "@/lib/auth/platform-owner";

export default async function AdminProvidersPage() {
  await requirePlatformOwner();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h1 className="text-2xl font-semibold text-white">Providers</h1>
      <p className="mt-3 text-sm text-slate-300">
        Provider management page scaffolded. Next step is to list provider orgs,
        relationships, and onboarding state.
      </p>
    </div>
  );
}