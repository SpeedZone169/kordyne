"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  project_type: string;
};

const PROJECT_ATTACHMENT_BUCKET = "project-attachments";
const MAX_PROJECT_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFileName(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "attachment";
}

async function getCurrentUserAndMembership() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    membership: membership as MembershipRow | null,
  };
}

async function requireProjectAccess(projectId: string) {
  const { supabase, user } = await getCurrentUserAndMembership();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, project_type")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    throw new Error("Project not found.");
  }

  const typedProject = project as ProjectRow;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", typedProject.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("You do not have access to this project.");
  }

  return {
    supabase,
    user,
    project: typedProject,
    membership: membership as MembershipRow,
  };
}

export async function createProjectAction(formData: FormData) {
  const { supabase, user, membership } = await getCurrentUserAndMembership();
  const name = cleanText(formData.get("name"));
  const description = cleanText(formData.get("description")) || null;
  const projectTypeValue = cleanText(formData.get("project_type"));
  const projectType =
    projectTypeValue === "single_part_workspace"
      ? "single_part_workspace"
      : "multi_part_project";

  if (!membership?.organization_id) {
    throw new Error("You are not a member of an organization.");
  }

  if (!["admin", "engineer"].includes(membership.role || "")) {
    throw new Error("Only admins and engineers can create projects.");
  }

  if (!name) {
    throw new Error("Project name is required.");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: membership.organization_id,
      name,
      description,
      project_type: projectType,
      status: "active",
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create project.");
  }

  revalidatePath("/dashboard/projects");
  redirect(`/dashboard/projects/${data.id}`);
}

export async function addPartToProjectAction(
  projectId: string,
  formData: FormData,
) {
  const partId = cleanText(formData.get("part_id"));
  const makePrimary = formData.get("is_primary_part") === "on";

  if (!partId) {
    throw new Error("Choose a part to add.");
  }

  const { supabase } = await requireProjectAccess(projectId);

  const { error } = await supabase.rpc("add_part_to_project", {
    p_project_id: projectId,
    p_part_id: partId,
    p_is_primary_part: makePrimary,
  });

  if (error) {
    throw new Error(error.message || "Failed to add part to project.");
  }

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addProjectMessageAction(
  projectId: string,
  formData: FormData,
) {
  const body = cleanText(formData.get("body"));
  const attachment = formData.get("attachment");
  const file = attachment instanceof File && attachment.size > 0 ? attachment : null;

  if (!body && !file) {
    throw new Error("Write a message or attach a file.");
  }

  if (file && file.size > MAX_PROJECT_ATTACHMENT_BYTES) {
    throw new Error("Project attachments are limited to 25 MB.");
  }

  const { supabase, user, project } = await requireProjectAccess(projectId);
  const messageBody = body || `Uploaded ${file?.name || "attachment"}.`;

  const { data: message, error: messageError } = await supabase
    .from("project_messages")
    .insert({
      project_id: project.id,
      organization_id: project.organization_id,
      author_user_id: user.id,
      body: messageBody,
      message_type: "message",
      visibility: "project",
    })
    .select("id")
    .single();

  if (messageError || !message) {
    throw new Error(messageError?.message || "Failed to send project message.");
  }

  if (file) {
    const storagePath = `${user.id}/${project.id}/${Date.now()}-${safeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PROJECT_ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload attachment.");
    }

    const { error: attachmentError } = await supabase
      .from("project_message_attachments")
      .insert({
        project_message_id: message.id,
        project_id: project.id,
        uploaded_by_user_id: user.id,
        file_name: file.name,
        file_type: file.type || null,
        file_size_bytes: file.size,
        storage_bucket: PROJECT_ATTACHMENT_BUCKET,
        storage_path: storagePath,
      });

    if (attachmentError) {
      throw new Error(attachmentError.message || "Failed to record attachment.");
    }
  }

  revalidatePath("/dashboard/collaboration");
  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function addProjectMilestoneAction(
  projectId: string,
  formData: FormData,
) {
  const title = cleanText(formData.get("title"));
  const description = cleanText(formData.get("description")) || null;
  const statusValue = cleanText(formData.get("status"));
  const status = ["planned", "active", "completed", "blocked"].includes(statusValue)
    ? statusValue
    : "planned";
  const targetDate = cleanText(formData.get("target_date")) || null;

  if (!title) {
    throw new Error("Milestone title is required.");
  }

  const { supabase, user, project, membership } = await requireProjectAccess(projectId);

  if (!["admin", "engineer"].includes(membership.role || "")) {
    throw new Error("Only admins and engineers can manage milestones.");
  }

  const { error } = await supabase.from("project_milestones").insert({
    project_id: project.id,
    organization_id: project.organization_id,
    title,
    description,
    status,
    target_date: targetDate,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    created_by_user_id: user.id,
  });

  if (error) {
    throw new Error(error.message || "Failed to create milestone.");
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
}

export async function updateProjectMilestoneStatusAction(
  projectId: string,
  milestoneId: string,
  formData: FormData,
) {
  const statusValue = cleanText(formData.get("status"));
  const status = ["planned", "active", "completed", "blocked"].includes(statusValue)
    ? statusValue
    : "planned";
  const { supabase, membership } = await requireProjectAccess(projectId);

  if (!["admin", "engineer"].includes(membership.role || "")) {
    throw new Error("Only admins and engineers can manage milestones.");
  }

  const { error } = await supabase
    .from("project_milestones")
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", milestoneId)
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message || "Failed to update milestone.");
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
}
