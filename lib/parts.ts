export const PART_CATEGORY_OPTIONS = [
  "part",
  "assembly",
  "spare_part",
  "tooling",
  "jig_fixture",
  "prototype",
  "document_only",
  "other",
] as const;

export type PartCategory = (typeof PART_CATEGORY_OPTIONS)[number];

export const PROCESS_TYPE_OPTIONS = [
  "3d_printing",
  "cnc_machining",
  "sheet_metal",
  "injection_molding",
  "composite_manufacturing",
  "casting",
  "fabrication",
  "multi_process",
  "other",
] as const;

export type ProcessType = (typeof PROCESS_TYPE_OPTIONS)[number];

export function getPartCategoryLabel(value: string | null | undefined) {
  switch (value) {
    case "part":
      return "Part";
    case "assembly":
      return "Assembly";
    case "spare_part":
      return "Spare Part";
    case "tooling":
      return "Tooling";
    case "jig_fixture":
      return "Jig / Fixture";
    case "prototype":
      return "Prototype";
    case "document_only":
      return "Document Only";
    case "other":
      return "Other";
    default:
      return value || "-";
  }
}

export function getProcessTypeLabel(value: string | null | undefined) {
  switch (value) {
    case "3d_printing":
      return "3D Printing";
    case "cnc_machining":
      return "CNC Machining";
    case "sheet_metal":
      return "Sheet Metal";
    case "injection_molding":
      return "Injection Molding";
    case "composite_manufacturing":
      return "Composite Manufacturing";
    case "casting":
      return "Casting";
    case "fabrication":
      return "Fabrication";
    case "multi_process":
      return "Multi Process";
    case "other":
      return "Other";
    default:
      return value || "-";
  }
}