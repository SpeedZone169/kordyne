import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  addPartToProjectAction,
  addProjectMessageAction,
  addProjectMilestoneAction,
  updateProjectMilestoneStatusAction,
} from "../actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
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

type ProjectPartLinkRow = {
  id: string;
  project_id: string;
  part_id: string;
  is_primary_part: boolean;
  created_at: string;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  asset_category: string | null;
  created_at: string;
};

type ProjectMessageRow = {
  id: string;
  author_user_id: string | null;
  message_type: string;
  body: string;
  visibility: string;
  created_at: string;
};

type ProjectMessageAttachmentRow = {
  id: string;
  project_message_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
};

type ProjectMilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

const MILESTONE_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Complete" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

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

function formatBytes(value: number | null) {
  if (!value || value <= 0) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(value: string | null | undefined) {
  return (
    (value || "K")
      .split(/[ @.]/)
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "K"
  );
}

function getProjectTypeLabel(projectType: string) {
  return projectType === "single_part_workspace"
    ? "Part Workspace"
    : "Project";
}

function getMilestoneClass(status: string) {
  switch (status) {
    case "active":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "blocked":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function isImageFile(file: Pick<PartFileRow, "file_name" | "file_type" | "asset_category">) {
  const mime = (file.file_type || "").toLowerCase();
  const extension = file.file_name.split(".").pop()?.toLowerCase() || "";

  return (
    file.asset_category === "image" ||
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
  );
}

function pickThumbnail(files: PartFileRow[]) {
  return files.find(isImageFile) ?? null;
}

export default async function ProjectWorkspacePage({ params }: PageProps) {
  const { id: projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projectRaw, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, name, description, project_type, status, updated_at, created_at")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !projectRaw) {
    notFound();
  }

  const project = projectRaw as ProjectRow;

  const { data: membershipRaw } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const membership = membershipRaw as MembershipRow | null;

  if (!membership) {
    notFound();
  }

  const canManage = ["admin", "engineer"].includes(membership.role || "");

  const [
    { data: linksRaw },
    { data: allPartsRaw },
    { data: messagesRaw },
    { data: milestonesRaw },
  ] = await Promise.all([
    supabase
      .from("project_part_links")
      .select("id, project_id, part_id, is_primary_part, created_at")
      .eq("project_id", project.id)
      .order("is_primary_part", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("parts")
      .select("id, name, part_number, revision, status, updated_at, created_at")
      .eq("organization_id", project.organization_id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("project_messages")
      .select("id, author_user_id, message_type, body, visibility, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("project_milestones")
      .select("id, title, description, status, target_date, completed_at, created_at")
      .eq("project_id", project.id)
      .order("target_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  const links = (linksRaw as ProjectPartLinkRow[] | null) ?? [];
  const allParts = (allPartsRaw as PartRow[] | null) ?? [];
  const linkedPartIds = links.map((link) => link.part_id);
  const linkedPartIdSet = new Set(linkedPartIds);
  const linkedParts = linkedPartIds
    .map((partId) => allParts.find((part) => part.id === partId) ?? null)
    .filter((part): part is PartRow => Boolean(part));
  const availableParts = allParts.filter((part) => !linkedPartIdSet.has(part.id));
  const messages = (messagesRaw as ProjectMessageRow[] | null) ?? [];
  const milestones = (milestonesRaw as ProjectMilestoneRow[] | null) ?? [];
  const messageIds = messages.map((message) => message.id);

  const [{ data: partFilesRaw }, { data: attachmentsRaw }, { data: sharesRaw }] =
    await Promise.all([
      linkedPartIds.length > 0
        ? supabase
            .from("part_files")
            .select("id, part_id, file_name, file_type, file_size_bytes, storage_path, asset_category, created_at")
            .in("part_id", linkedPartIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as PartFileRow[] }),
      messageIds.length > 0
        ? supabase
            .from("project_message_attachments")
            .select("id, project_message_id, file_name, file_type, file_size_bytes, storage_bucket, storage_path, created_at")
            .in("project_message_id", messageIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as ProjectMessageAttachmentRow[] }),
      linkedPartIds.length > 0
        ? supabase
            .from("part_external_shares")
            .select("id, part_id, status")
            .in("part_id", linkedPartIds)
            .in("status", ["invited", "active"])
        : Promise.resolve({ data: [] as Array<{ id: string; part_id: string; status: string }> }),
    ]);

  const partFiles = (partFilesRaw as PartFileRow[] | null) ?? [];
  const filesByPartId = new Map<string, PartFileRow[]>();

  for (const file of partFiles) {
    const current = filesByPartId.get(file.part_id) ?? [];
    current.push(file);
    filesByPartId.set(file.part_id, current);
  }

  const thumbnailFiles = linkedParts
    .map((part) => pickThumbnail(filesByPartId.get(part.id) ?? []))
    .filter((file): file is PartFileRow => Boolean(file));
  const thumbnailUrls = new Map<string, string>();

  await Promise.all(
    thumbnailFiles.map(async (file) => {
      const { data } = await supabase.storage
        .from("part-files")
        .createSignedUrl(file.storage_path, 60 * 10);

      if (data?.signedUrl) {
        thumbnailUrls.set(file.id, data.signedUrl);
      }
    }),
  );

  const attachments = (attachmentsRaw as ProjectMessageAttachmentRow[] | null) ?? [];
  const attachmentUrls = new Map<string, string>();

  await Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(attachment.storage_bucket)
        .createSignedUrl(attachment.storage_path, 60 * 10);

      if (data?.signedUrl) {
        attachmentUrls.set(attachment.id, data.signedUrl);
      }
    }),
  );

  const attachmentsByMessageId = new Map<string, ProjectMessageAttachmentRow[]>();
  for (const attachment of attachments) {
    const current = attachmentsByMessageId.get(attachment.project_message_id) ?? [];
    current.push(attachment);
    attachmentsByMessageId.set(attachment.project_message_id, current);
  }

  const profileIds = [
    ...new Set(messages.map((message) => message.author_user_id).filter(Boolean)),
  ] as string[];
  const { data: profilesRaw } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", profileIds)
      : { data: [] as ProfileRow[] };
  const profiles = new Map(
    ((profilesRaw as ProfileRow[] | null) ?? []).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );

  const activeShareCount = ((sharesRaw ?? []) as Array<{ id: string }>).length;
  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;

  return (
    <section className="mx-auto max-w-[1540px] space-y-5">
      <div className="rounded-[14px] border border-slate-900 bg-[#0b1524] p-6 text-white shadow-sm lg:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/projects"
                className="rounded-[10px] border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.1]"
              >
                Back to projects
              </Link>
              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">
                {getProjectTypeLabel(project.project_type)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-slate-200">
                {project.status || "active"}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight lg:text-5xl">
              {project.name}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">
              {project.description ||
                "A controlled project space for linked vault parts, collaboration, documentation, and milestone tracking."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 xl:w-[560px]">
            <Metric label="Parts" value={linkedParts.length.toString()} />
            <Metric label="Messages" value={messages.length.toString()} />
            <Metric
              label="Milestones"
              value={`${completedMilestones}/${milestones.length}`}
            />
            <Metric label="Shares" value={activeShareCount.toString()} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)_360px]">
        <aside className="space-y-5">
          <section className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
                  Parts and documentation
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The project references vault parts. Files remain governed by
                  vault permissions and explicit file grants.
                </p>
              </div>
            </div>

            {linkedParts.length > 0 ? (
              <div className="mt-5 space-y-3">
                {linkedParts.map((part) => {
                  const partFilesForCard = filesByPartId.get(part.id) ?? [];
                  const thumbnail = pickThumbnail(partFilesForCard);
                  const link = links.find((item) => item.part_id === part.id);

                  return (
                    <article
                      key={part.id}
                      className="overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50"
                    >
                      {thumbnail && thumbnailUrls.get(thumbnail.id) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Signed storage URLs are short-lived and already permissioned.
                        <img
                          src={thumbnailUrls.get(thumbnail.id)}
                          alt=""
                          className="h-40 w-full bg-white object-contain"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center bg-slate-100 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Vault part
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/parts/${part.id}`}
                              className="block truncate text-base font-black text-slate-950 transition hover:text-slate-700"
                            >
                              {part.name}
                            </Link>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span>{part.part_number || "No part number"}</span>
                              <span>Rev {part.revision || "-"}</span>
                              <span>{partFilesForCard.length} files</span>
                            </div>
                          </div>

                          {link?.is_primary_part ? (
                            <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white">
                              Primary
                            </span>
                          ) : null}
                        </div>

                        {partFilesForCard.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {partFilesForCard.slice(0, 3).map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-800">
                                    {file.file_name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {file.asset_category || "file"} - {formatBytes(file.file_size_bytes)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                No parts linked yet. Add a vault part below to make this a real
                project workspace.
              </div>
            )}
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
              Add part from Vault
            </h2>
            <form
              action={addPartToProjectAction.bind(null, project.id)}
              className="mt-4 space-y-3"
            >
              <select
                name="part_id"
                disabled={!canManage || availableParts.length === 0}
                className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 disabled:opacity-60"
                defaultValue=""
              >
                <option value="">
                  {availableParts.length > 0
                    ? "Choose a vault part"
                    : "All visible parts are already linked"}
                </option>
                {availableParts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name}
                    {part.part_number ? ` - ${part.part_number}` : ""}
                    {part.revision ? ` - Rev ${part.revision}` : ""}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="is_primary_part"
                  disabled={!canManage}
                />
                Mark as primary project part
              </label>
              <button
                type="submit"
                disabled={!canManage || availableParts.length === 0}
                className="w-full rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Add to project
              </button>
            </form>
          </section>
        </aside>

        <main className="min-w-0 rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
              Project discussion
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Use this room for R&D decisions, manufacturing questions, file
              handoffs, and partner-facing clarification.
            </p>
          </div>

          <div className="grid min-h-[720px] grid-rows-[1fr_auto]">
            <div className="space-y-4 overflow-y-auto bg-slate-50/60 p-5">
              {messages.length > 0 ? (
                messages.map((message) => {
                  const profile = message.author_user_id
                    ? profiles.get(message.author_user_id)
                    : null;
                  const senderName =
                    profile?.full_name || profile?.email || "Project update";
                  const messageAttachments =
                    attachmentsByMessageId.get(message.id) ?? [];

                  return (
                    <article
                      key={message.id}
                      className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        {profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Profile avatars are user-provided URLs.
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
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
                            {message.visibility === "internal_only" ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                Internal
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {message.body}
                          </p>

                          {messageAttachments.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {messageAttachments.map((attachment) => {
                                const href = attachmentUrls.get(attachment.id);
                                const label = `${attachment.file_name} - ${formatBytes(
                                  attachment.file_size_bytes,
                                )}`;

                                return href ? (
                                  <a
                                    key={attachment.id}
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
                                  >
                                    {label}
                                  </a>
                                ) : (
                                  <span
                                    key={attachment.id}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500"
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center">
                  <div className="max-w-md">
                    <p className="text-xl font-black text-slate-950">
                      Start the project room
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add design intent, meeting notes, reviewer questions, or
                      project files. This is scoped to the project, not the full
                      Vault.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form
              action={addProjectMessageAction.bind(null, project.id)}
              encType="multipart/form-data"
              className="border-t border-slate-200 bg-white p-5"
            >
              <textarea
                name="body"
                rows={4}
                placeholder="@person add an update, decision, manufacturing note, or reviewer question"
                className="w-full resize-none rounded-[12px] border border-slate-300 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-slate-500"
              />
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="block min-w-0 text-sm text-slate-600">
                  <span className="sr-only">Attach project file</span>
                  <input
                    name="attachment"
                    type="file"
                    className="w-full text-sm text-slate-600 file:mr-3 file:rounded-[10px] file:border file:border-slate-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-800"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-[10px] bg-slate-950 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Send update
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Attachments are stored as project files. External access still
                needs an explicit project or file grant.
              </p>
            </form>
          </div>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
              Timeline
            </h2>

            <div className="mt-4 space-y-3">
              {milestones.length > 0 ? (
                milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="rounded-[12px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {milestone.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {milestone.target_date
                            ? `Target ${formatDate(milestone.target_date)}`
                            : "No target date"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getMilestoneClass(
                          milestone.status,
                        )}`}
                      >
                        {milestone.status}
                      </span>
                    </div>

                    {milestone.description ? (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {milestone.description}
                      </p>
                    ) : null}

                    {canManage ? (
                      <form
                        action={updateProjectMilestoneStatusAction.bind(
                          null,
                          project.id,
                          milestone.id,
                        )}
                        className="mt-3 flex gap-2"
                      >
                        <select
                          name="status"
                          defaultValue={milestone.status}
                          className="min-w-0 flex-1 rounded-[10px] border border-slate-300 bg-white px-3 py-2 text-xs"
                        >
                          {MILESTONE_STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-[10px] border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800"
                        >
                          Save
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  No project milestones yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
              Add milestone
            </h2>
            <form
              action={addProjectMilestoneAction.bind(null, project.id)}
              className="mt-4 space-y-3"
            >
              <input
                name="title"
                placeholder="Design freeze"
                disabled={!canManage}
                className="w-full rounded-[10px] border border-slate-300 px-3 py-3 text-sm disabled:opacity-60"
              />
              <textarea
                name="description"
                rows={3}
                placeholder="Owner, decision, or success criteria"
                disabled={!canManage}
                className="w-full resize-none rounded-[10px] border border-slate-300 px-3 py-3 text-sm disabled:opacity-60"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  name="target_date"
                  disabled={!canManage}
                  className="w-full rounded-[10px] border border-slate-300 px-3 py-3 text-sm disabled:opacity-60"
                />
                <select
                  name="status"
                  disabled={!canManage}
                  className="w-full rounded-[10px] border border-slate-300 bg-white px-3 py-3 text-sm disabled:opacity-60"
                  defaultValue="planned"
                >
                  {MILESTONE_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={!canManage}
                className="w-full rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                Add milestone
              </button>
            </form>
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-800">
              Access model
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <AccessRow
                title="Vault source of truth"
                body="Linked parts remain controlled by vault revision and file permissions."
              />
              <AccessRow
                title="Project collaborators"
                body="Organization members can see this room. External access should be granted explicitly."
              />
              <AccessRow
                title="External sharing"
                body="Use part shares or routed project file grants so partners see only selected context."
              />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-white/10 bg-white/[0.06] p-4">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function AccessRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
      <p className="font-bold text-slate-950">{title}</p>
      <p className="mt-1 leading-6 text-slate-600">{body}</p>
    </div>
  );
}
