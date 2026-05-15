import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <Navbar />

      <section className="relative overflow-hidden bg-[#101823] text-white">
        <div className="absolute inset-0 kordyne-grid-bg opacity-65" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <p className="text-xs font-black uppercase text-[#e08a49]">
              Customer access
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-6xl">
              Kordyne workspaces are opened through approved onboarding.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Customer accounts are created after the company workspace, plan,
              seats, and access model are confirmed. Invited users can complete
              setup from the secure invitation sent to their work email.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#e08a49] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c97539]"
              >
                Request access
              </Link>
              <Link
                href="/login"
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white p-6 text-slate-900 shadow-[0_24px_70px_rgba(2,8,23,0.28)]">
            <p className="text-xs font-black uppercase text-slate-500">
              Onboarding flow
            </p>
            <div className="mt-5 space-y-3">
              {[
                [
                  "Workspace review",
                  "Kordyne aligns the vault, project, manufacturing, and collaboration requirements with the company.",
                ],
                [
                  "Plan activation",
                  "The organization is configured with approved seats, roles, and starting capabilities.",
                ],
                [
                  "Secure invite",
                  "Admins and users receive invitation links that create accounts inside the approved workspace.",
                ],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className="rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-4"
                >
                  <p className="text-xs font-black text-[#e08a49]">
                    0{index + 1}
                  </p>
                  <h2 className="mt-2 text-base font-black text-slate-950">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "Part vault and revision governance",
            "Provider and external viewer access",
            "Machine connectors and request routing",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[8px] border border-slate-200 bg-white p-5 text-sm font-bold text-slate-900 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
