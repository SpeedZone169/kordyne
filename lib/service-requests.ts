export const SERVICE_REQUEST_TYPES = [
  "manufacture_part",
  "cad_creation",
  "optimization",
] as const;

export type ServiceRequestType = (typeof SERVICE_REQUEST_TYPES)[number];

export const SERVICE_REQUEST_STATUSES = [
  "submitted",
  "in_review",
  "awaiting_customer",
  "approved",
  "in_progress",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type ServiceRequestStatus = (typeof SERVICE_REQUEST_STATUSES)[number];

export const SERVICE_REQUEST_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export type ServiceRequestPriority = (typeof SERVICE_REQUEST_PRIORITIES)[number];

export const MANUFACTURING_TYPES = [
  "prototype_3d_print",
  "cnc_spare_part",
  "composite_manufacturing",
  "other",
] as const;

export type ManufacturingType = (typeof MANUFACTURING_TYPES)[number];

export const CAD_OUTPUT_TYPES = ["3d", "2d", "both"] as const;
export type CadOutputType = (typeof CAD_OUTPUT_TYPES)[number];

export const OPTIMIZATION_GOALS = [
  "cost",
  "manufacturability",
  "weight",
  "performance",
  "general",
] as const;

export type OptimizationGoal = (typeof OPTIMIZATION_GOALS)[number];

export const SOURCE_REFERENCE_TYPES = [
  "existing_part_files",
  "uploaded_files",
  "external_reference",
] as const;

export type SourceReferenceType = (typeof SOURCE_REFERENCE_TYPES)[number];

export const QUOTE_MODELS = ["none", "money", "credits"] as const;
export type QuoteModel = (typeof QUOTE_MODELS)[number];

export function getServiceRequestTypeLabel(type: ServiceRequestType) {
  switch (type) {
    case "manufacture_part":
      return "Manufacture";
    case "cad_creation":
      return "CAD creation";
    case "optimization":
      return "Optimization";
    default:
      return type;
  }
}

export function getServiceRequestStatusLabel(status: ServiceRequestStatus) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In review";
    case "awaiting_customer":
      return "Awaiting customer";
    case "approved":
      return "Approved";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export function getManufacturingTypeLabel(type?: string | null) {
  switch (type) {
    case "prototype_3d_print":
      return "3D print prototype";
    case "cnc_spare_part":
      return "CNC / spare part";
    case "composite_manufacturing":
      return "Composite manufacturing";
    case "other":
      return "Other manufacturing";
    default:
      return "Manufacturing";
  }
}

export function getPriorityLabel(priority: ServiceRequestPriority) {
  switch (priority) {
    case "low":
      return "Low";
    case "normal":
      return "Normal";
    case "high":
      return "High";
    case "urgent":
      return "Urgent";
    default:
      return priority;
  }
}

export const STATUS_BADGE_CLASSES: Record<ServiceRequestStatus, string> = {
  submitted: "bg-slate-100 text-slate-700",
  in_review: "bg-amber-100 text-amber-800",
  awaiting_customer: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-zinc-100 text-zinc-700",
};