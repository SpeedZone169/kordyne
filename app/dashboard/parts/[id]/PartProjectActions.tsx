"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProjectOption = {
  id: string;
  name: string;
  projectType: string;
  status: string | null;
};

type LinkedProject = ProjectOption & {
  isPrimaryPart: boolean;
};

type ShareableFile = {
  id: string;
  fileName: string;
  assetCategory: string | null;
  fileType: string | null;
};

type Props = {
  partId: string;
  partName: string;
  partNumber: string | null;
  canManage: boolean;
  projects: ProjectOption[];
  linkedProjects: LinkedProject[];
  files: ShareableFile[];
};

type DialogMode = "share" | "create" | "add" | null;

const SHARE_POLICIES = [
  { value: "metadata_only", label: "Metadata only" },
  { value: "preview_only", label: "Preview only" },
  { value: "selected_files", label: "Selected files" },
  { value: "downloadable_selected_files", label: "Downloadable selected files" },
] as const;

type SharePolicy = (typeof SHARE_POLICIES)[number]["value"];

function getProjectLabel(projectType: string) {
  return projectType === "single_part_workspace"
    ? "Part Workspace"
    : "Project";
}

export default function PartProjectActions({
  partId,
  partName,
  partNumber,
  canManage,
  projects,
  linkedProjects,
  files,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [projectName, setProjectName] = useState(
    `${partNumber ? `${partNumber} - ` : ""}${partName}`,
  );
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [sharePolicy, setSharePolicy] =
    useState<SharePolicy>("metadata_only");
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const linkedProjectIds = useMemo(
    () => new Set(linkedProjects.map((project) => project.id)),
    [linkedProjects],
  );

  const availableProjects = projects.filter(
    (project) => !linkedProjectIds.has(project.id),
  );

  function openDialog(mode: DialogMode) {
    setDialogMode(mode);
    setError("");
  }

  function closeDialog() {
    if (busy) return;
    setDialogMode(null);
    setError("");
  }

  function toggleFile(fileId: string) {
    setSelectedFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId],
    );
  }

  async function createProject() {
    if (busy) return;

    setBusy(true);
    setError("");

    const { data, error: createError } = await supabase.rpc(
      "create_project_from_part",
      {
        p_part_id: partId,
        p_name: projectName.trim() || null,
        p_project_type: "multi_part_project",
      },
    );

    setBusy(false);

    if (createError || !data) {
      setError(createError?.message || "Failed to create project.");
      return;
    }

    setDialogMode(null);
    router.push(`/dashboard/projects?project=${data}`);
    router.refresh();
  }

  async function addToProject() {
    if (busy || !selectedProjectId) return;

    setBusy(true);
    setError("");

    const { error: addError } = await supabase.rpc("add_part_to_project", {
      p_project_id: selectedProjectId,
      p_part_id: partId,
      p_is_primary_part: false,
    });

    setBusy(false);

    if (addError) {
      setError(addError.message || "Failed to add part to project.");
      return;
    }

    setDialogMode(null);
    router.refresh();
  }

  async function sharePart() {
    if (busy) return;

    setBusy(true);
    setError("");

    const response = await fetch("/api/part-shares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partId,
        externalEmail: shareEmail,
        sharePolicy,
        fileIds:
          sharePolicy === "selected_files" ||
          sharePolicy === "downloadable_selected_files"
            ? selectedFileIds
            : [],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setError(payload.error || "Failed to create part share.");
      return;
    }

    setDialogMode(null);
    setShareEmail("");
    setSelectedFileIds([]);
    router.refresh();
  }

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
            Part workspace
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            This part stays standalone until you share it or link it to a project.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openDialog("share")}
            disabled={!canManage}
            className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Share part
          </button>
          <button
            type="button"
            onClick={() => openDialog("create")}
            disabled={!canManage}
            className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create project from this part
          </button>
          <button
            type="button"
            onClick={() => openDialog("add")}
            disabled={!canManage || availableProjects.length === 0}
            className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to existing project
          </button>
          <a
            href="#linked-projects"
            className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
          >
            View linked projects
          </a>
          <a
            href="#part-workspace"
            className="rounded-[10px] border border-slate-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
          >
            Open part workspace
          </a>
        </div>
      </div>

      <div id="linked-projects" className="mt-4">
        {linkedProjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {linkedProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects?project=${project.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
              >
                {getProjectLabel(project.projectType)}: {project.name}
                {project.isPrimaryPart ? " - primary" : ""}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No linked projects. The part is currently only in the Parts Vault.
          </p>
        )}
      </div>

      {dialogMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[14px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {dialogMode === "share"
                    ? "Share part"
                    : dialogMode === "create"
                      ? "Create project from this part"
                      : "Add to existing project"}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {partNumber ? `${partNumber} - ` : ""}
                  {partName}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-[8px] border border-slate-200 px-3 py-1 text-sm font-bold text-slate-700"
              >
                Close
              </button>
            </div>

            {dialogMode === "share" ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">
                    External collaborator email
                  </span>
                  <input
                    value={shareEmail}
                    onChange={(event) => setShareEmail(event.target.value)}
                    type="email"
                    className="mt-2 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    placeholder="person@company.com"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-800">
                    Sharing level
                  </span>
                  <select
                    value={sharePolicy}
                    onChange={(event) =>
                      setSharePolicy(event.target.value as SharePolicy)
                    }
                    className="mt-2 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {SHARE_POLICIES.map((policy) => (
                      <option key={policy.value} value={policy.value}>
                        {policy.label}
                      </option>
                    ))}
                  </select>
                </label>

                {sharePolicy === "selected_files" ||
                sharePolicy === "downloadable_selected_files" ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Selected files
                    </p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-[10px] border border-slate-200 p-3">
                      {files.map((file) => (
                        <label
                          key={file.id}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.id)}
                            onChange={() => toggleFile(file.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="block font-semibold">
                              {file.fileName}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {file.fileType || "unknown"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void sharePart()}
                  disabled={busy}
                  className="w-full rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Creating share..." : "Create controlled share"}
                </button>
              </div>
            ) : null}

            {dialogMode === "create" ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">
                    Project name
                  </span>
                  <input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    className="mt-2 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void createProject()}
                  disabled={busy}
                  className="w-full rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create project"}
                </button>
              </div>
            ) : null}

            {dialogMode === "add" ? (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">
                    Existing project
                  </span>
                  <select
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                    className="mt-2 w-full rounded-[10px] border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">Choose a project</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {getProjectLabel(project.projectType)} - {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void addToProject()}
                  disabled={busy || !selectedProjectId}
                  className="w-full rounded-[10px] bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Adding..." : "Add part to project"}
                </button>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
