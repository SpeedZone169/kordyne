type ShowcaseVariant = "hero" | "platform" | "enterprise" | "providers";

const stages = [
  { label: "Vault", value: "CAD + docs", tone: "bg-[#00bdde]" },
  { label: "Revision", value: "B.3 released", tone: "bg-[#8ceeff]" },
  { label: "Request", value: "3 providers", tone: "bg-emerald-300" },
  { label: "Thread", value: "@vendor note", tone: "bg-white/70" },
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
      className={`kordyne-workflow-scene relative overflow-hidden border border-white/12 bg-[#003040] text-white shadow-[0_24px_80px_rgba(0,48,64,0.28)] ${
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
            <span className="rounded-[8px] border border-[#00bdde]/35 bg-[#00bdde]/10 px-3 py-1 text-xs font-bold text-[#8ceeff]">
              In control
            </span>
          </div>

          <div className="relative min-h-[270px] overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
            <div className="kordyne-part-plate absolute left-[12%] top-[22%] h-36 w-[58%] rounded-[8px] border border-white/16 bg-[#8b98a8]/70 shadow-[0_28px_60px_rgba(0,0,0,0.32)]" />
            <div className="kordyne-part-plate absolute left-[28%] top-[12%] h-24 w-24 rounded-full border-[14px] border-[#657282] bg-[#222d3a] shadow-[0_20px_40px_rgba(0,0,0,0.28)]" />
            <div className="absolute left-[16%] top-[30%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#003040]" />
            <div className="absolute left-[58%] top-[30%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#003040]" />
            <div className="absolute left-[18%] top-[65%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#003040]" />
            <div className="absolute left-[60%] top-[65%] h-5 w-5 rounded-full border-4 border-[#273446] bg-[#003040]" />

            <div className="kordyne-callout absolute right-4 top-6 max-w-[210px] rounded-[8px] border border-[#00bdde]/40 bg-[#00bdde]/10 p-3">
              <p className="text-xs font-black text-[#dffaff]">{copy.primary}</p>
              <p className="mt-1 text-xs leading-5 text-[#dffaff]/70">
                STEP, STL, PDF, and image context stay tied to revision history.
              </p>
            </div>

            <div className="kordyne-callout absolute bottom-4 left-4 max-w-[260px] rounded-[8px] border border-[#00bdde]/35 bg-[#00bdde]/12 p-3">
              <p className="text-xs font-black text-[#dffaff]">
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
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00bdde]" />
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

export function HomeWorkflowShowcase() {
  const flow = [
    ["CAD tools", "Publish package"],
    ["Parts Vault", "Control revision"],
    ["Workspace", "Share selectively"],
    ["Handoff", "Return evidence"],
  ];

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#022836] p-5 text-white shadow-[0_28px_90px_rgba(0,48,64,0.34)]">
      <div className="absolute inset-0 kordyne-grid-bg opacity-35" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#00bdde]/12 to-transparent" />

      <div className="relative flex items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-black uppercase text-[#8ceeff]">
            Kordyne operating layer
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            One controlled record from release to production
          </h3>
        </div>
        <span className="rounded-[8px] border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-xs font-black text-emerald-100">
          Live context
        </span>
      </div>

      <div className="relative mt-5 rounded-[8px] border border-white/12 bg-white/[0.06] p-4">
        <div className="grid gap-3 lg:grid-cols-4">
          {flow.map(([label, action], index) => (
            <div
              key={label}
              className="kordyne-animate-in rounded-[8px] border border-white/12 bg-[#003040]/80 p-4"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#00bdde] text-xs font-black text-[#003040]">
                {index + 1}
              </span>
              <p className="mt-4 text-xs font-black uppercase text-white/45">
                {label}
              </p>
              <p className="mt-1 text-base font-black text-white">{action}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          {[
            ["Part truth", "Files, previews, revisions, and metadata stay together."],
            ["Access control", "Collaborators see only the selected context."],
            ["Manufacturing memory", "Quotes, notes, and returned files remain linked."],
          ].map(([title, body]) => (
            <div
              key={title}
              className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4"
            >
              <h4 className="text-sm font-black text-white">{title}</h4>
              <p className="mt-2 text-xs leading-5 text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 rounded-[8px] border border-[#00bdde]/25 bg-[#00bdde]/10 px-4 py-3 text-sm font-bold text-[#dffaff]">
        Built to keep engineering decisions, manufacturing handoffs, and
        external collaboration connected to the part record.
      </div>
    </div>
  );
}

export function ProviderWorkShowcase() {
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#022836] p-5 text-white shadow-[0_24px_80px_rgba(0,48,64,0.28)]">
      <div className="absolute inset-0 kordyne-grid-bg opacity-35" />

      <div className="relative">
        <div className="rounded-[8px] border border-white/12 bg-white/[0.07] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[#8ceeff]">
                Provider workspace
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                Incoming manufacturing package
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Complete files, requirements, questions, and quote response in
                one place.
              </p>
            </div>
            <span className="rounded-[8px] border border-amber-300/30 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
              New RFQ
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-3">
            {[
              ["CAD", "STEP, drawing, preview"],
              ["REQ", "Tolerance and quantity notes"],
              ["THREAD", "Customer questions attached"],
            ].map(([type, name]) => (
              <div
                key={name}
                className="rounded-[8px] border border-white/12 bg-white/[0.06] p-3"
              >
                <p className="text-xs font-black text-[#8ceeff]">{type}</p>
                <p className="mt-1 truncate text-sm font-bold text-white/85">
                  {name}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white/[0.06] p-4">
            <p className="text-xs font-black uppercase text-white/50">
              Provider response
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-xs text-white/50">Lead time</p>
                <p className="mt-1 text-lg font-black text-white">Quote faster</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-xs text-white/50">Files</p>
                <p className="mt-1 text-lg font-black text-white">No chasing</p>
              </div>
            </div>
            <div className="mt-4 rounded-[8px] border border-[#00bdde]/25 bg-[#00bdde]/10 p-3">
              <p className="text-sm font-black text-[#dffaff]">
                Clarification thread
              </p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                Ask technical questions against the same package instead of a
                scattered email chain.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
          A cleaner way for manufacturers to receive, quote, and return work.
        </div>
      </div>
    </div>
  );
}

export function OperatingLayerShowcase() {
  const evidence = [
    "CAD package published",
    "Revision C selected",
    "Provider files scoped",
    "Manufacturing route ready",
  ];

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#022836] p-5 text-white shadow-[0_28px_90px_rgba(0,48,64,0.34)]">
      <div className="absolute inset-0 kordyne-grid-bg opacity-45" />
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#00bdde]/18 blur-3xl" />
      <div className="absolute -bottom-28 left-8 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-[#8ceeff]">
            Live operating picture
          </p>
          <h3 className="mt-1 text-xl font-black text-white">
            One part record, every handoff controlled
          </h3>
        </div>
        <span className="rounded-[8px] border border-emerald-300/30 bg-emerald-300/12 px-3 py-1 text-xs font-black text-emerald-100">
          Ready
        </span>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[1fr_0.92fr]">
        <div className="rounded-[8px] border border-white/12 bg-white/[0.07] p-4">
          <div className="flex items-start gap-4">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[8px] border border-[#8ceeff]/25 bg-[#dffaff]/10">
              <div className="absolute left-6 top-7 h-16 w-16 rotate-[-12deg] rounded-[8px] border border-[#8ceeff]/40 bg-[#8b98a8]/70 shadow-[0_18px_40px_rgba(0,0,0,0.28)]" />
              <div className="absolute left-10 top-3 h-14 w-14 rounded-full border-[10px] border-[#657282] bg-[#1d2d38]" />
              <div className="absolute bottom-4 left-4 h-4 w-4 rounded-full border-4 border-[#263746] bg-[#003040]" />
              <div className="absolute bottom-4 right-5 h-4 w-4 rounded-full border-4 border-[#263746] bg-[#003040]" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-white/45">
                Controlled part
              </p>
              <h4 className="mt-1 text-2xl font-black text-white">
                Actuator bracket
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Rev C", "CNC", "Aluminium", "RFQ ready"].map((item) => (
                  <span
                    key={item}
                    className="rounded-[8px] border border-white/12 bg-white/[0.07] px-3 py-1 text-xs font-bold text-white/80"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">
                CAD source, STEP/STL, preview image, drawing, properties, and
                release notes are linked to the same revision.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
            {evidence.map((item, index) => (
              <div
                key={item}
                className="kordyne-animate-in rounded-[8px] border border-white/10 bg-[#003040]/70 px-3 py-2"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <p className="text-xs font-bold text-white/75">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {[
            ["CAD release", "Inventor, Fusion, and Onshape packages enter the vault."],
            ["Selected sharing", "Only approved files move to the provider workspace."],
            ["Manufacturing response", "Quotes, questions, returned files, and evidence stay linked."],
          ].map(([title, body], index) => (
            <div
              key={title}
              className="kordyne-animate-in rounded-[8px] border border-white/12 bg-white/[0.06] p-4"
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#00bdde] text-sm font-black text-[#003040]">
                  {index + 1}
                </span>
                <h4 className="text-base font-black text-white">{title}</h4>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/65">{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-4 rounded-[8px] border border-[#00bdde]/25 bg-[#00bdde]/10 px-4 py-3 text-sm font-bold text-[#dffaff]">
        The engineering record stays alive as work moves from design release to
        provider review, internal routing, and manufacturing evidence.
      </div>
    </div>
  );
}

const productFlowSteps = [
  {
    label: "CAD",
    title: "Publish package",
    body: "Native reference, STEP/STL, preview image, and properties enter the vault together.",
  },
  {
    label: "Vault",
    title: "Controlled record",
    body: "Revision, files, metadata, and source context stay attached to the part family.",
  },
  {
    label: "Workspace",
    title: "Collaborate selectively",
    body: "Create part or project spaces only when discussion, review, or sharing is needed.",
  },
  {
    label: "Handoff",
    title: "Route manufacturing",
    body: "Send selected files to internal resources or approved providers with context intact.",
  },
];

export function ProductFlowShowcase() {
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#022836] p-5 text-white shadow-[0_24px_80px_rgba(0,48,64,0.28)]">
      <div className="absolute inset-0 kordyne-grid-bg opacity-45" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-black uppercase text-[#8ceeff]">
              Platform flow
            </p>
            <h3 className="mt-1 text-xl font-black text-white">
              One controlled path from CAD to handoff
            </h3>
          </div>
          <span className="rounded-[8px] border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">
            Revision-aware
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {productFlowSteps.map((step, index) => (
            <div
              key={step.label}
              className="kordyne-animate-in grid gap-4 rounded-[8px] border border-white/12 bg-white/[0.06] p-4 sm:grid-cols-[88px_1fr]"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#00bdde]/35 bg-[#00bdde]/12 text-xs font-black text-[#8ceeff]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-xs font-black uppercase text-white/55">
                  {step.label}
                </span>
              </div>
              <div>
                <h4 className="text-base font-black text-white">{step.title}</h4>
                <p className="mt-1 text-sm leading-6 text-white/70">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
          {["Part truth", "Selected access", "Returned evidence"].map((item) => (
            <div
              key={item}
              className="rounded-[8px] border border-white/10 bg-[#003040]/75 px-4 py-3 text-sm font-black text-white"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProviderPackageShowcase() {
  return (
    <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-[#022836] p-5 text-white shadow-[0_24px_80px_rgba(0,48,64,0.28)]">
      <div className="absolute inset-0 kordyne-grid-bg opacity-35" />

      <div className="relative">
        <div className="rounded-[8px] border border-white/12 bg-white/[0.07] p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[#8ceeff]">
                Provider package
              </p>
              <h3 className="mt-2 text-xl font-black text-white">
                RFQ-4182 / Motor mount Rev C
              </h3>
              <p className="mt-2 text-sm leading-6 text-white/70">
                Scoped files, notes, and customer questions in one response
                workspace.
              </p>
            </div>
            <span className="rounded-[8px] border border-amber-300/30 bg-amber-300/12 px-3 py-1 text-xs font-black text-amber-100">
              Due Friday
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="space-y-3">
            {[
              ["STEP", "motor-mount-rev-c.step"],
              ["PDF", "drawing-pack-c.pdf"],
              ["PNG", "inspection-view.png"],
            ].map(([type, name]) => (
              <div
                key={name}
                className="rounded-[8px] border border-white/12 bg-white/[0.06] p-3"
              >
                <p className="text-xs font-black text-[#8ceeff]">{type}</p>
                <p className="mt-1 truncate text-sm font-bold text-white/85">
                  {name}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white/[0.06] p-4">
            <p className="text-xs font-black uppercase text-white/50">
              Quote response
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-xs text-white/50">Lead time</p>
                <p className="mt-1 text-lg font-black text-white">8 days</p>
              </div>
              <div className="rounded-[8px] bg-white/[0.07] p-3">
                <p className="text-xs text-white/50">Process</p>
                <p className="mt-1 text-lg font-black text-white">CNC</p>
              </div>
            </div>
            <div className="mt-4 rounded-[8px] border border-[#00bdde]/25 bg-[#00bdde]/10 p-3">
              <p className="text-sm font-black text-[#dffaff]">
                Clarification thread
              </p>
              <p className="mt-1 text-sm leading-6 text-white/70">
                “Can radius R4 be opened for tooling access?”
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-[8px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">
          Provider sees only this package, not the full customer vault.
        </div>
      </div>
    </div>
  );
}

export function ControlPanelShowcase() {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-[#0089a2]">
            Control model
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Share only what the work requires
          </h3>
        </div>
        <span className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          Protected
        </span>
      </div>

      <div className="mt-5 grid gap-3">
        {[
          ["Full vault", "Internal engineering and organization admins"],
          ["Part workspace", "Selected collaborators around one part or revision"],
          ["Provider package", "Scoped files, notes, quotes, and returned evidence"],
          ["Viewer access", "Preview-only review without broad download rights"],
        ].map(([label, detail]) => (
          <div
            key={label}
            className="grid gap-3 rounded-[8px] border border-slate-200 bg-[#f5f8fa] p-4 sm:grid-cols-[150px_1fr]"
          >
            <p className="text-sm font-black text-slate-950">{label}</p>
            <p className="text-sm leading-6 text-slate-600">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectorReleaseShowcase() {
  const publishSteps = [
    ["STEP", "Exchange geometry saved"],
    ["STL", "Viewer-ready file generated"],
    ["PNG", "Preview captured"],
    ["TXT", "CAD properties attached"],
  ];

  return (
    <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-black uppercase text-[#0089a2]">
            CAD connector
          </p>
          <h3 className="mt-1 text-xl font-black text-slate-950">
            Publish package to Kordyne
          </h3>
        </div>
        <span className="rounded-[8px] border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          Connected
        </span>
      </div>

      <div className="mt-5 rounded-[8px] border border-slate-200 bg-[#f5f8fa] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-slate-950">Bracket Housing</p>
            <p className="mt-1 text-sm text-slate-600">
              New revision package / Rev C
            </p>
          </div>
          <span className="rounded-[8px] bg-[#00bdde] px-3 py-1 text-xs font-black text-[#003040]">
            Vault match
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-[82%] rounded-full bg-[#00bdde]" />
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">
          Preparing controlled release package
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {publishSteps.map(([type, detail]) => (
          <div
            key={type}
            className="rounded-[8px] border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-black text-[#0089a2]">{type}</p>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-800">
              {detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[8px] bg-[#003040] px-4 py-3 text-sm font-bold text-white">
        Engineers publish once. The vault receives the files, preview, metadata,
        and revision decision together.
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
