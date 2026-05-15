import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WorkflowShowcase } from "@/components/MarketingShowcase";

const plans = [
  {
    name: "Starter",
    fit: "Small engineering teams building a controlled part vault.",
    model: "Launch workspace",
    highlight: "Vault, revisions, previews, and basic request flow",
    cta: "Start a discussion",
  },
  {
    name: "Professional",
    fit: "Teams coordinating parts, suppliers, and internal manufacturing.",
    model: "Team workspace",
    highlight: "Projects, collaboration, provider packages, and quotes",
    cta: "Request demo",
  },
  {
    name: "Business",
    fit: "Operations teams managing multiple projects, machines, and providers.",
    model: "Operations workspace",
    highlight: "Machine connectors, scheduling context, and audit exports",
    cta: "Talk to Kordyne",
  },
  {
    name: "Enterprise",
    fit: "Larger organizations with governance, security, and integration needs.",
    model: "Custom agreement",
    highlight: "SSO, advanced access control, onboarding, and integrations",
    cta: "Plan enterprise rollout",
  },
];

const featureRows = [
  ["Part vault and revision history", "Included", "Included", "Included", "Included"],
  ["STEP, image, PDF, and drawing review", "Included", "Included", "Included", "Included"],
  ["Project library", "Limited", "Included", "Included", "Included"],
  ["Part-level collaboration", "Included", "Included", "Included", "Included"],
  ["External viewers and consultants", "Limited", "Included", "Included", "Included"],
  ["Provider request packages", "Limited", "Included", "Included", "Included"],
  ["Quotes and invoice workflow", "-", "Included", "Included", "Included"],
  ["Machine connectors and scheduling context", "-", "Available", "Included", "Included"],
  ["OEM digital spare-parts catalog", "-", "Available", "Available", "Custom"],
  ["SSO, audit exports, and custom retention", "-", "-", "Available", "Included"],
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#e08a49]">
      {children}
    </p>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#101823] text-white">
        <div className="absolute inset-0 kordyne-grid-bg opacity-70" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-6xl">
              Plans for part vaults, manufacturing requests, and supplier
              collaboration at every stage.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Choose a workspace shape around how your team releases CAD,
              controls revisions, collaborates with providers, and connects
              internal manufacturing capacity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#e08a49] px-5 py-3 text-sm font-black text-white transition hover:bg-[#c97539]"
              >
                Request pricing
              </Link>
              <Link
                href="/platform"
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                View platform
              </Link>
            </div>
          </div>

          <WorkflowShowcase variant="enterprise" compact />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-4 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <article
              key={plan.name}
              className={`rounded-[8px] border p-5 shadow-sm ${
                index === 1
                  ? "border-[#e08a49] bg-white shadow-[0_18px_48px_rgba(224,138,73,0.16)]"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-xs font-black uppercase text-slate-500">
                {plan.model}
              </p>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {plan.name}
              </h2>
              <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">
                {plan.fit}
              </p>
              <div className="mt-5 rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-4">
                <p className="text-sm font-bold leading-6 text-slate-900">
                  {plan.highlight}
                </p>
              </div>
              <Link
                href="/contact"
                className={`mt-5 inline-flex w-full items-center justify-center rounded-[8px] px-4 py-3 text-sm font-black transition ${
                  index === 1
                    ? "bg-[#e08a49] text-white hover:bg-[#c97539]"
                    : "border border-slate-300 bg-white text-slate-950 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <Eyebrow>Compare plans</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Start with the vault, then add manufacturing depth as the
              workflow grows.
            </h2>
          </div>

          <div className="mt-9 overflow-hidden rounded-[8px] border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-[880px] w-full border-collapse bg-white text-left text-sm">
                <thead className="bg-[#101823] text-white">
                  <tr>
                    <th className="w-[32%] px-4 py-4 font-black">Capability</th>
                    {plans.map((plan) => (
                      <th key={plan.name} className="px-4 py-4 font-black">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {featureRows.map((row) => (
                    <tr key={row[0]} className="border-t border-slate-200">
                      {row.map((cell, index) => (
                        <td
                          key={`${row[0]}-${index}`}
                          className={`px-4 py-4 ${
                            index === 0
                              ? "font-bold text-slate-950"
                              : "text-slate-600"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>Marketplace-ready</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Machine OEMs can become a controlled source for certified spare
              part files.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Kordyne can support manufacturer catalogs where approved machine
              owners purchase or request access to controlled 3D files, then
              manufacture internally or route to an approved provider with
              entitlement, licensing, and revision evidence intact.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Machine model catalog",
              "Part file licensing",
              "Approved buyer access",
              "Provider-ready packages",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[8px] border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
