export default function AdminInvitesPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Invites
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Invite management
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This page is reserved for centralized invite management. Customer and
          provider invite flows are currently handled from the Organizations and
          Providers admin pages.
        </p>
      </section>
    </div>
  );
}
