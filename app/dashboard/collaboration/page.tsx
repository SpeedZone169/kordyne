import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CollaborationComposer from "./CollaborationComposer";

type PageProps = {
  searchParams?: Promise<{
    packageId?: string;
    projectId?: string;
  }>;
};

type ServiceRequestRow = {
  id: string;
  organization_id: string;
  title: string | null;
  request_type: string;
  status: string;
  updated_at: string | null;
  created_at: string;
};

type ProviderPackageRow = {
  id: string;
  service_request_id: string;
  customer_org_id: string;
  provider_org_id: string;
  package_title: string | null;
  package_status: string;
  customer_visible_status: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  provider_request_package_id: string;
  sender_org_id: string;
  sender_user_id: string | null;
  message_type: string;
  message_body: string;
  is_system: boolean;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  project_type: string;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type ProjectMessageRow = {
  id: string;
  project_id: string;
  author_user_id: string | null;
  body: string;
  created_at: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitials(value: string | null | undefined) {
  return (
    (value || "K")
      .split(/[ @.]/)
      .map((part: string) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "K"
  );
}

function getStatusClass(status: string) {
  if (["awarded", "accepted", "completed"].includes(status)) {
    return "bg-emerald-100 text-emerald-800";
  }

  if (["not_awarded", "rejected", "cancelled"].includes(status)) {
    return "bg-rose-100 text-rose-800";
  }

  if (["published", "viewed", "quote_submitted"].includes(status)) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function CollaborationPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const organizationIds = [
    ...new Set((memberships ?? []).map((row) => row.organization_id)),
  ];

  const { data: projectsRaw } =
    organizationIds.length > 0
      ? await supabase
          .from("projects")
          .select("id, organization_id, name, description, project_type, status, updated_at, created_at")
          .in("organization_id", organizationIds)
          .neq("status", "archived")
          .order("updated_at", { ascending: false })
      : { data: [] as ProjectRow[] };

  const projects = (projectsRaw ?? []) as ProjectRow[];
  const projectIds = projects.map((project) => project.id);

  const { data: projectMessagesRaw } =
    projectIds.length > 0
      ? await supabase
          .from("project_messages")
          .select("id, project_id, author_user_id, body, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })
          .limit(120)
      : { data: [] as ProjectMessageRow[] };

  const projectMessages = (projectMessagesRaw ?? []) as ProjectMessageRow[];

  const { data: requestsRaw } =
    organizationIds.length > 0
      ? await supabase
          .from("service_requests")
          .select("id, organization_id, title, request_type, status, updated_at, created_at")
          .in("organization_id", organizationIds)
          .order("updated_at", { ascending: false })
      : { data: [] as ServiceRequestRow[] };

  const requests = (requestsRaw ?? []) as ServiceRequestRow[];
  const requestIds = requests.map((request) => request.id);

  const { data: packagesRaw } =
    requestIds.length > 0
      ? await supabase
          .from("provider_request_packages")
          .select(
            "id, service_request_id, customer_org_id, provider_org_id, package_title, package_status, customer_visible_status, created_at",
          )
          .in("service_request_id", requestIds)
          .order("created_at", { ascending: false })
      : { data: [] as ProviderPackageRow[] };

  const packages = (packagesRaw ?? []) as ProviderPackageRow[];
  const packageIds = packages.map((pkg) => pkg.id);

  const { data: messagesRaw } =
    packageIds.length > 0
      ? await supabase
          .from("provider_messages")
          .select(
            "id, provider_request_package_id, sender_org_id, sender_user_id, message_type, message_body, is_system, created_at",
          )
          .in("provider_request_package_id", packageIds)
          .order("created_at", { ascending: false })
          .limit(80)
      : { data: [] as MessageRow[] };

  const messages = (messagesRaw ?? []) as MessageRow[];
  const profileIds = [
    ...new Set(
      [
        ...messages.map((message) => message.sender_user_id),
        ...projectMessages.map((message) => message.author_user_id),
      ].filter(Boolean),
    ),
  ] as string[];
  const senderOrgIds = [
    ...new Set(packages.flatMap((pkg) => [pkg.customer_org_id, pkg.provider_org_id])),
  ];

  const [{ data: profilesRaw }, { data: organizationsRaw }] = await Promise.all([
    profileIds.length > 0
      ? supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", profileIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
    senderOrgIds.length > 0
      ? supabase.from("organizations").select("id, name").in("id", senderOrgIds)
      : Promise.resolve({ data: [] as OrganizationRow[] }),
  ]);

  const requestMap = new Map(requests.map((request) => [request.id, request]));
  const profileMap = new Map(
    ((profilesRaw ?? []) as ProfileRow[]).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );
  const orgMap = new Map(
    ((organizationsRaw ?? []) as OrganizationRow[]).map((org) => [org.id, org.name]),
  );

  const messagesByPackageId = new Map<string, MessageRow[]>();
  for (const message of messages) {
    const existing = messagesByPackageId.get(message.provider_request_package_id) ?? [];
    existing.push(message);
    messagesByPackageId.set(message.provider_request_package_id, existing);
  }

  const projectMessagesByProjectId = new Map<string, ProjectMessageRow[]>();
  for (const message of projectMessages) {
    const existing = projectMessagesByProjectId.get(message.project_id) ?? [];
    existing.push(message);
    projectMessagesByProjectId.set(message.project_id, existing);
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedProject =
    projects.find((project) => project.id === resolvedSearchParams.projectId) ??
    null;
  const selectedPackage =
    selectedProject
      ? null
      : (packages.find((pkg) => pkg.id === resolvedSearchParams.packageId) ??
        packages[0] ??
        null);
  const selectedRequest = selectedPackage
    ? requestMap.get(selectedPackage.service_request_id) ?? null
    : null;
  const selectedMessages = selectedPackage
    ? messagesByPackageId.get(selectedPackage.id) ?? []
    : [];
  const selectedProjectMessages = selectedProject
    ? projectMessagesByProjectId.get(selectedProject.id) ?? []
    : [];

  return (
    <section className="mx-auto max-w-[1540px]">
      <div className="mb-5 rounded-[14px] border border-slate-900 bg-[#0b1524] p-6 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
          Collaboration
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Project, part, provider, and reviewer conversations.
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
          Select a project room or provider thread without granting broad vault
          access. External parties see only explicitly shared project context,
          routed request files, or selected part files.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)_320px]">
        <aside className="space-y-5">
          <section className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
                Project rooms
              </h2>
            </div>

            <div className="max-h-[360px] overflow-y-auto p-3">
              {projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.map((project) => {
                    const projectRoomMessages =
                      projectMessagesByProjectId.get(project.id) ?? [];
                    const selected = selectedProject?.id === project.id;

                    return (
                      <Link
                        key={project.id}
                        href={`/dashboard/collaboration?projectId=${project.id}`}
                        className={`block rounded-[12px] border p-3 transition ${
                          selected
                            ? "border-[#d98042] bg-[#fff8f2]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-slate-900 text-xs font-bold text-white">
                            {getInitials(project.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-950">
                              {project.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {project.project_type === "single_part_workspace"
                                ? "Part Workspace"
                                : "Project"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {projectRoomMessages.length} messages
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                Updated {formatDateTime(project.updated_at || project.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[12px] border border-dashed border-slate-300 p-5 text-sm leading-6 text-slate-500">
                  No project rooms yet. Create a project from the Projects page
                  or from a part detail page.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              Provider threads
            </h2>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-3">
            {packages.length > 0 ? (
              <div className="space-y-2">
                {packages.map((pkg) => {
                  const request = requestMap.get(pkg.service_request_id);
                  const providerName =
                    orgMap.get(pkg.provider_org_id) ||
                    `Provider ${pkg.provider_org_id.slice(0, 8)}`;
                  const packageMessages = messagesByPackageId.get(pkg.id) ?? [];
                  const selected = selectedPackage?.id === pkg.id;

                  return (
                    <Link
                      key={pkg.id}
                      href={`/dashboard/collaboration?packageId=${pkg.id}`}
                      className={`block rounded-[12px] border p-3 transition ${
                        selected
                          ? "border-[#d98042] bg-[#fff8f2]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-slate-900 text-xs font-bold text-white">
                          {getInitials(providerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {pkg.package_title || request?.title || "Provider package"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {providerName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
                                pkg.package_status,
                              )}`}
                            >
                              {pkg.package_status.replaceAll("_", " ")}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {packageMessages.length} messages
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[12px] border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                No provider threads yet. Route a request to providers to create a collaboration thread.
              </div>
            )}
          </div>
          </section>
        </aside>

        <main className="min-w-0 rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  {selectedProject?.name ||
                    selectedPackage?.package_title ||
                    selectedRequest?.title ||
                    "Select a collaboration thread"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProject
                    ? "Project room messages, milestones, and file attachments are handled inside the project workspace."
                    : selectedPackage
                    ? `${orgMap.get(selectedPackage.customer_org_id) || "Customer"} and ${
                        orgMap.get(selectedPackage.provider_org_id) || "provider"
                      }`
                    : "Messages, result images, clarifications, and thread-only file exchange appear here."}
                </p>
              </div>

              {selectedProject ? (
                <Link
                  href={`/dashboard/projects/${selectedProject.id}`}
                  className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Open project workspace
                </Link>
              ) : selectedRequest ? (
                <Link
                  href={`/dashboard/requests/${selectedRequest.id}`}
                  className="rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Open request
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid min-h-[620px] grid-rows-[1fr_auto]">
            <div className="space-y-4 overflow-y-auto p-5">
              {selectedProject ? (
                selectedProjectMessages.length > 0 ? (
                  [...selectedProjectMessages].reverse().map((message) => {
                    const profile = message.author_user_id
                      ? profileMap.get(message.author_user_id)
                      : null;
                    const senderName =
                      profile?.full_name ||
                      profile?.email ||
                      "Project update";

                    return (
                      <div
                        key={message.id}
                        className="rounded-[12px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element -- Profile avatars can be remote URLs.
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {getInitials(senderName)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-bold text-slate-950">
                                {senderName}
                              </p>
                              <span className="text-xs text-slate-400">
                                {formatDateTime(message.created_at)}
                              </span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {message.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <div className="max-w-md">
                      <p className="text-lg font-black text-slate-950">
                        No project messages yet
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Open the project workspace to start the discussion, add
                        milestones, and attach project files.
                      </p>
                    </div>
                  </div>
                )
              ) : selectedMessages.length > 0 ? (
                [...selectedMessages].reverse().map((message) => {
                  const profile = message.sender_user_id
                    ? profileMap.get(message.sender_user_id)
                    : null;
                  const senderName =
                    profile?.full_name ||
                    profile?.email ||
                    orgMap.get(message.sender_org_id) ||
                    "System";

                  return (
                    <div
                      key={message.id}
                      className={`rounded-[12px] border p-4 ${
                        message.is_system
                          ? "border-slate-200 bg-slate-50"
                          : "border-sky-200 bg-sky-50/70"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Profile avatars can be remote URLs.
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {getInitials(senderName)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">{senderName}</p>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(message.created_at)}
                            </span>
                            {message.is_system ? (
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                System
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {message.message_body}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="max-w-md">
                    <p className="text-lg font-black text-slate-950">
                      No messages yet
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Start with a question, tolerance clarification, image result, or an @email mention.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5">
              {selectedProject ? (
                <Link
                  href={`/dashboard/projects/${selectedProject.id}`}
                  className="flex items-center justify-center rounded-[12px] bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Continue in project workspace
                </Link>
              ) : (
                <CollaborationComposer providerPackageId={selectedPackage?.id ?? null} />
              )}
            </div>
          </div>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              Access model
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-950">Vault members</p>
                <p className="mt-1 text-slate-500">
                  Can manage part files based on organization role.
                </p>
              </div>
              <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                <p className="font-bold text-slate-950">Providers</p>
                <p className="mt-1 text-slate-500">
                  See only the routed package files and the shared thread.
                </p>
              </div>
              <div className="rounded-[10px] border border-[#d98042] bg-[#fff8f2] p-3">
                <p className="font-bold text-slate-950">External reviewers</p>
                <p className="mt-1 text-slate-500">
                  Reviewers should be invited to a project, part workspace, or
                  selected file grant. They do not receive full vault access.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              Shared assets
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-3xl font-black text-slate-950">
                  {packages.length}
                </div>
                <p className="text-xs font-semibold text-slate-500">Threads</p>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-950">
                  {messages.length + projectMessages.length}
                </div>
                <p className="text-xs font-semibold text-slate-500">Messages</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
