type ShowcaseVariant = "hero" | "platform" | "enterprise" | "providers";

const stages = [
  { label: "Vault", value: "CAD + docs", tone: "bg-[#e08a49]" },
  { label: "Revision", value: "B.3 released", tone: "bg-[#2f80b7]" },
  { label: "Request", value: "3 providers", tone: "bg-[#29a66a]" },
  { label: "Thread", value: "@vendor note", tone: "bg-[#d7b46a]" },
];

const variantCopy: Record<
  ShowcaseVariant,
  {
    title: string;
    primary: string;
    secondary: string;
    activity: string[];
  }
> = {
  hero: {
    title: "Composite Wing Rib V1.3",
    primary: "Live STEP review",
    secondary: "Provider routing prepared",
    activity: [
      "Revision B.3 approved for external RFQ",
      "Tolerance clarification pinned to feature B",
      "Machine connector reports nylon cell available",
    ],
  },
  platform: {
    title: "CNC Motor Mount V3",
    primary: "Part vault + request flow",
    secondary: "Internal and external routing",
    activity: [
      "PDF drawing and STEP package selected",
      "Internal queue checked before vendor release",
      "Customer thread remains linked to revision V3",
    ],
  },
  enterprise: {
    title: "Aero Bracket Assembly",
    primary: "Controlled release workspace",
    secondary: "Audit trail ready",
    activity: [
      "Viewer access limited to selected package",
      "Provider package sent without full vault exposure",
      "Revision, file, and message history retained",
    ],
  },
  providers: {
    title: "Supplier Package 4182",
    primary: "Quote response workspace",
    secondary: "Clarifications open",
    activity: [
      "Customer shared 6 controlled files",
      "Manufacturability note attached to feature C",
      "Quote and lead time pending approval",
    ],
  },
};

export function WorkflowShowcase({
  variant = "hero",
  compact = false,
}: {
  variant?: ShowcaseVariant;
  compact?: boolean;
}) {
  const copy = variantCopy[variant];

  return (
    <div
      className={`kordyne-workflow-scene relative overflow-hidden border border-white/12 bg-[#101823] text-white shadow-[0_24px_80px_rgba(2,8,23,0.28)] ${
        compact ? "rounded-[8px] p-4" : "rounded-[8px] p-5 sm:p-6"
      }`}
    >
      <div className="absolute inset-0 kordyne-grid-bg" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/30" />
      <div className="kordyne-scan-line absolute left-0 right-0 top-0 h-16 opacity-70" />

      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <p className="text-xs font-bold uppercase text-white/50">
                Digital thread
              </p>
              <h3 className="mt-1 text-lg font-black text-white">
                {copy.title}
              </h3>
            </div>
            <span className="rounded-[8px] border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
              In control
            </span>
          </div>

          <div className="relative min-h-[270px] overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <div className="kordyne-part-plate absolute left-[12%] top-[22%] h-36 w-[58%] rounded-[8px] border border-white/16 bg-[#8b98a8]/70 shadow-[0_28px_60px_rgba(0,0,0,0.32)]" />
            <div className="kordyne-part-plate absolute left-[28%] top-[12%] h-24 w-24 rounded-full border-[14px] border-[#657282] bg-[#222d3a] shadow-[0_20px_40px_rgba(0,0,0,0.28)]" />
            <div className="absolute left-[16%] top-[30%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#101823]" />
            <div className="absolute left-[58%] top-[30%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#101823]" />
            <div className="absolute left-[18%] top-[65%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#101823]" />
            <div className="absolute left-[60%] top-[65%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#101823]" />

            <div className="kordyne-callout absolute right-4 top-6 max-w-[210px] rounded-[8px] border border-sky-300/40 bg-sky-400/10 p-3">
              <p className="text-xs font-black text-sky-100">{copy.primary}</p>
              <p className="mt-1 text-xs leading-5 text-sky-100/70">
                STEP, STL, PDF, and image context stay tied to revision history.
              </p>
            </div>

            <div className="kordyne-callout absolute bottom-4 left-4 max-w-[260px] rounded-[8px] border border-[#e08a49]/50 bg-[#e08a49]/12 p-3">
              <p className="text-xs font-black text-[#ffd9bd]">
                {copy.secondary}
              </p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                Selected files move through controlled request packages.
              </p>
            </div>

            <div className="absolute bottom-6 right-8 h-14 w-24 rounded-[8px] border border-white/14 bg-white/[0.07] p-2">
              <div className="h-2 rounded-full bg-emerald-300" />
              <div className="mt-2 h-2 w-2/3 rounded-full bg-white/20" />
              <div className="mt-2 h-2 w-4/5 rounded-full bg-white/20" />
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          {stages.map((stage, index) => (
            <div
              key={stage.label}
              className="kordyne-animate-in rounded-[8px] border border-white/10 bg-white/[0.06] p-3"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.tone}`} />
                <p className="text-xs font-black uppercase text-white/50">
                  {stage.label}
                </p>
              </div>
              <p className="mt-2 text-sm font-bold text-white">{stage.value}</p>
            </div>
          ))}

          <div className="rounded-[8px] border border-white/10 bg-white/[0.06] p-3">
            <p className="text-xs font-black uppercase text-white/50">
              Activity
            </p>
            <div className="mt-3 space-y-2">
              {copy.activity.map((item) => (
                <div key={item} className="flex gap-2 text-xs leading-5 text-white/72">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e08a49]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function WorkflowStrip() {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {[
        "Inventor / Fusion save",
        "Part vault release",
        "Revision review",
        "Request routing",
        "Provider collaboration",
      ].map((item, index) => (
        <div
          key={item}
          className="kordyne-animate-in rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <p className="text-xs font-black uppercase text-slate-500">
            Step {index + 1}
          </p>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-900">
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}
