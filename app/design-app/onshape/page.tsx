"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ConnectionState =
  | "checking"
  | "not_connected"
  | "opening_browser"
  | "waiting"
  | "connected"
  | "working"
  | "error";

type OnshapeContext = {
  documentId: string;
  workspaceOrVersion: string;
  workspaceOrVersionId: string;
  workspaceId: string;
  versionId: string;
  microversionId: string;
  elementId: string;
  tabElementId: string;
  partId: string;
  partNumber: string;
  partName: string;
  documentName: string;
  elementName: string;
  revision: string;
  companyId: string;
  userId: string;
  locale: string;
  clientId: string;
  configuration: string;
  server: string;
  externalUrl: string;
};

type UserProfile = {
  user?: {
    email?: string | null;
    full_name?: string | null;
  } | null;
  organization?: {
    name?: string | null;
  } | null;
  membership?: {
    role?: string | null;
  } | null;
  onshape?: {
    oauth_connected?: boolean | null;
    token_expires_at?: string | null;
    last_test_status?: string | null;
  } | null;
};

type PublishedPart = {
  part_id: string;
  part_family_id?: string | null;
  name?: string | null;
  part_number?: string | null;
  description?: string | null;
  process_type?: string | null;
  material?: string | null;
  category?: string | null;
  revision?: string | null;
  revision_index?: number | null;
  status?: string | null;
  search_score?: number | null;
  revision_count?: number | null;
  updated_at?: string | null;
  thumbnail_url?: string | null;
  thumbnail_signed_url?: string | null;
  preview_url?: string | null;
  image_url?: string | null;
  linked_projects?: Array<{
    id: string;
    name: string;
    project_type: string;
    status: string | null;
  }>;
  revisions?: PublishedPart[];
};

type LibraryProject = {
  id: string;
  name: string;
  project_type: string;
  status: string | null;
};

type UploadedDesignFile = {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  role: "step" | "stl" | "native" | "thumbnail" | "properties";
  file_extension?: string | null;
};

type OnshapeResolvedPart = {
  name?: string | null;
  partId?: string | null;
  partNumber?: string | null;
  revision?: string | null;
  state?: string | null;
  description?: string | null;
  elementId?: string | null;
  microversionId?: string | null;
  bodyType?: string | null;
};

type ThemeMode = "light" | "dark";
type ActiveTab = "connect" | "publish" | "library" | "pull" | "compare";
type PublishMode = "new_family" | "new_revision";
type PublishStatus = "idle" | "checking" | "saving" | "publishing" | "published";
type LibrarySort = "recent" | "name_asc" | "revision_desc" | "status";
type PublishStepId =
  | "checkpoint"
  | "stl"
  | "step"
  | "properties"
  | "preview"
  | "package";
type PublishStepStatus = "pending" | "active" | "done" | "warning" | "error";
type PublishStep = {
  id: PublishStepId;
  label: string;
  status: PublishStepStatus;
  detail?: string;
};

type PullFile = {
  file_id?: string;
  filename: string;
  mime_type?: string;
  size_bytes?: number | null;
  storage_path?: string;
  signed_url: string;
  file_extension?: string | null;
  native_format?: {
    format?: string;
    canonical_extension?: string;
    feature_tree_strategy?: string;
  } | null;
  is_primary?: boolean;
  is_assembly?: boolean;
};

type PullPackage = {
  ok: boolean;
  part: {
    id: string;
    name?: string | null;
    revision?: string | null;
    status?: string | null;
    part_family_id?: string | null;
  };
  availability: {
    has_native: boolean;
    has_step: boolean;
    native_count: number;
    step_count: number;
  };
  native_files: PullFile[];
  step_files: PullFile[];
  source_link?: {
    id?: string | null;
    external_document_id?: string | null;
    external_workspace_id?: string | null;
    external_item_id?: string | null;
    focus_element_id?: string | null;
    external_revision_id?: string | null;
    external_name?: string | null;
    external_url?: string | null;
    open_url?: string | null;
  } | null;
  open_action?: {
    mode: "native_source";
    label: string;
    url: string;
  } | null;
  message?: string;
};

type ImportStepPayload = {
  ok: boolean;
  mode: "new_document" | "current_document";
  part: {
    id: string;
    name?: string | null;
    revision?: string | null;
    status?: string | null;
    part_family_id?: string | null;
  };
  file: {
    id?: string | null;
    filename?: string | null;
    size_bytes?: number | null;
  };
  onshape: {
    document_id?: string | null;
    workspace_id?: string | null;
    element_id?: string | null;
    translation_id?: string | null;
    open_url?: string | null;
  };
  message?: string;
};

type CompareWorkspacePayload = {
  ok: boolean;
  assembly?: {
    element_id?: string | null;
    open_url?: string | null;
    inserted_count?: number;
    warnings?: string[];
  } | null;
  rows: Array<{
    label: string;
    name?: string | null;
    revision?: string | null;
    material?: string | null;
    process_type?: string | null;
    file_name?: string | null;
    file_size_bytes?: number | null;
    onshape_element_id?: string | null;
    onshape_part_id?: string | null;
    volume_m3?: number | null;
  }>;
  message?: string;
};

type CompareStatusPayload = {
  ok: boolean;
  current: PublishedPart;
  latest: PublishedPart;
  revisions: PublishedPart[];
  status: {
    is_latest_revision: boolean;
    current_revision_index: number;
    latest_revision_index: number;
    revision_count: number;
  };
};

type CompareStepPackage = {
  ok: boolean;
  source: PublishedPart;
  latest: PublishedPart;
  step_file: PullFile;
};

type LibraryCompareResult = {
  left: {
    part: PublishedPart;
    stepFile: PullFile;
    imported: ImportStepPayload;
  };
  right: {
    part: PublishedPart;
    stepFile: PullFile;
    imported: ImportStepPayload;
  };
  fileSizeDeltaBytes: number | null;
};

const TOKEN_STORAGE_KEY = "kordyne:onshape:connection-token";
const THEME_STORAGE_KEY = "kordyne:onshape:theme";
const HANDOFF_STORAGE_KEY = "kordyne:onshape:last-handoff";
const ONSHAPE_EXTENSION_ACTION_URL =
  "https://www.kordyne.com/design-app/onshape?documentId={$documentId}&workspaceOrVersion={$workspaceOrVersion}&workspaceOrVersionId={$workspaceOrVersionId}&elementId={$elementId}&tabElementId={$tabElementId}&partId={$partId}&partNumber={$partNumber}&revision={$revision}&configuration={$configuration}";

function cleanOnshapeParam(value: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (/^\{\$[A-Za-z0-9_]+\}$/.test(trimmed)) return "";
  if (/^\$\{[A-Za-z0-9_]+\}$/.test(trimmed)) return "";
  return trimmed;
}

function getParam(params: URLSearchParams, ...names: string[]) {
  for (const name of names) {
    const value = cleanOnshapeParam(params.get(name));
    if (value) return value;
  }

  return "";
}

function parseOnshapeContext() {
  const params = new URLSearchParams(window.location.search);
  const server = getParam(params, "server") || "https://cad.onshape.com";
  const documentId = getParam(params, "documentId", "documentid", "did");
  const workspaceOrVersion =
    getParam(params, "workspaceOrVersion", "wvm") ||
    (getParam(params, "versionId", "vid") ? "v" : "w");
  const workspaceOrVersionId = getParam(
    params,
    "workspaceOrVersionId",
    "wvmid",
    "workspaceId",
    "versionId",
    "wid",
    "vid",
  );
  const workspaceId =
    workspaceOrVersion === "w"
      ? workspaceOrVersionId
      : getParam(params, "workspaceId", "wid");
  const versionId =
    workspaceOrVersion === "v"
      ? workspaceOrVersionId
      : getParam(params, "versionId", "vid");
  const elementId = getParam(params, "elementId", "elementid", "eid");
  const tabElementId = getParam(params, "tabElementId", "tabElementid");

  let externalUrl = "";
  if (documentId && workspaceOrVersionId && elementId) {
    externalUrl = `${server.replace(/\/$/, "")}/documents/${documentId}/${workspaceOrVersion}/${workspaceOrVersionId}/e/${elementId}`;
  }

  return {
    documentId,
    workspaceOrVersion,
    workspaceOrVersionId,
    workspaceId,
    versionId,
    microversionId: getParam(params, "microversionId", "mid"),
    elementId,
    tabElementId,
    partId: getParam(params, "partId", "partid", "pid"),
    partNumber: getParam(params, "partNumber", "partnumber"),
    partName: getParam(params, "partName", "partname", "name"),
    documentName: getParam(params, "documentName", "documentname"),
    elementName: getParam(params, "elementName", "elementname"),
    revision: getParam(params, "revision"),
    companyId: getParam(params, "companyId"),
    userId: getParam(params, "userId"),
    locale: getParam(params, "locale"),
    clientId: getParam(params, "clientId"),
    configuration: getParam(params, "configuration"),
    server,
    externalUrl,
  } satisfies OnshapeContext;
}

function contextStorageKey(context: OnshapeContext) {
  return [
    "kordyne:onshape:last-part",
    context.documentId || "no-document",
    context.elementId || context.tabElementId || "no-element",
    context.partId || "no-part",
  ].join(":");
}

function displayNameForContext(context: OnshapeContext) {
  if (context.partName) return context.partName;
  if (context.elementName) return context.elementName;
  if (context.documentName) return context.documentName;
  if (context.partNumber) return context.partNumber;
  if (context.partId) return `Onshape part ${context.partId}`;
  if (context.elementId) return `Onshape element ${context.elementId}`;
  if (context.documentId) return `Onshape document ${context.documentId}`;
  return "Onshape design";
}

function fieldOrDash(value?: string | null) {
  return value?.trim() || "-";
}

function nextRevisionHint(revision?: string | null) {
  const value = revision?.trim();
  if (!value) return "";

  if (/^[A-Z]$/i.test(value)) {
    return String.fromCharCode(value.toUpperCase().charCodeAt(0) + 1);
  }

  if (/^\d+$/.test(value)) {
    return String(Number(value) + 1);
  }

  return "";
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatVolume(value?: number | null) {
  if (!value || value <= 0) return "-";
  const cubicMillimeters = value * 1_000_000_000;
  if (cubicMillimeters < 1000) return `${cubicMillimeters.toFixed(1)} mm3`;
  const cubicCentimeters = value * 1_000_000;
  if (cubicCentimeters < 1000) return `${cubicCentimeters.toFixed(2)} cm3`;
  return `${(value * 1000).toFixed(3)} L`;
}

function formatDeltaPercent(left?: number | null, right?: number | null) {
  if (!left || !right || left <= 0) return "-";
  const delta = ((right - left) / left) * 100;
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(2)}%`;
}

function initialPublishSteps(): PublishStep[] {
  return [
    { id: "checkpoint", label: "Onshape state", status: "pending" },
    { id: "stl", label: "STL viewer", status: "pending" },
    { id: "step", label: "STEP exchange", status: "pending" },
    { id: "properties", label: "Part properties", status: "pending" },
    { id: "preview", label: "Preview image", status: "pending" },
    { id: "package", label: "Kordyne package", status: "pending" },
  ];
}

function partDisplayName(part?: PublishedPart | null) {
  if (!part) return "Kordyne part";
  return part.name || part.part_number || part.part_id || "Kordyne part";
}

function revisionDisplay(part?: PublishedPart | null) {
  return part?.revision ? `Rev ${part.revision}` : "No revision";
}

function primaryStepFile(files: PullFile[]) {
  return files.find((file) => file.is_primary) ?? files[0] ?? null;
}

function hasPublishableOnshapeContext(context: OnshapeContext | null) {
  return Boolean(
    context?.documentId &&
      context.elementId &&
      context.workspaceOrVersionId &&
      context.workspaceOrVersion,
  );
}

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function randomIdempotencyKey() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `onshape-${random}`;
}

type ConnectorIconName =
  | "alert"
  | "building"
  | "check"
  | "chevronDown"
  | "compare"
  | "cube"
  | "description"
  | "external"
  | "gear"
  | "hash"
  | "info"
  | "layers"
  | "library"
  | "link"
  | "part"
  | "pull"
  | "role"
  | "search"
  | "select"
  | "sun"
  | "tag"
  | "text"
  | "upload"
  | "user";

function ConnectorIcon({
  name,
  className = "h-5 w-5",
}: {
  name: ConnectorIconName;
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      {...common}
    >
      {name === "alert" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
        </>
      ) : null}
      {name === "building" ? (
        <>
          <path d="M5 21V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V21" />
          <path d="M15 9h2.5A1.5 1.5 0 0 1 19 10.5V21" />
          <path d="M8 8h1.5M8 12h1.5M8 16h1.5M12 8h.5M12 12h.5M12 16h.5M4 21h16" />
        </>
      ) : null}
      {name === "check" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.4 12.2 2.4 2.4 4.8-5.2" />
        </>
      ) : null}
      {name === "chevronDown" ? <path d="m7 9 5 5 5-5" /> : null}
      {name === "compare" ? (
        <>
          <path d="M8 7h8M8 17h8" />
          <path d="m10 4-3 3 3 3M14 14l3 3-3 3" />
        </>
      ) : null}
      {name === "cube" ? (
        <>
          <path d="m12 3.5 7 4v8l-7 4-7-4v-8l7-4Z" />
          <path d="M5.4 7.8 12 11.6l6.6-3.8M12 11.6v7.6" />
        </>
      ) : null}
      {name === "description" ? (
        <>
          <path d="M5 6h14M5 11h14M5 16h10" />
        </>
      ) : null}
      {name === "external" ? (
        <>
          <path d="M9 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V15" />
          <path d="M13 5h6v6M19 5l-8 8" />
        </>
      ) : null}
      {name === "gear" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2M12 18.5v2M4.6 7.8l1.7 1M17.7 15.2l1.7 1M4.6 16.2l1.7-1M17.7 8.8l1.7-1M3.5 12h2M18.5 12h2" />
        </>
      ) : null}
      {name === "hash" ? (
        <>
          <path d="M9.5 4.5 7.8 19.5M16.2 4.5l-1.7 15M5 9h15M4 15h15" />
        </>
      ) : null}
      {name === "info" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 8h.01" />
        </>
      ) : null}
      {name === "layers" ? (
        <>
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
        </>
      ) : null}
      {name === "library" ? (
        <>
          <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H8v16H6.5A1.5 1.5 0 0 1 5 18.5v-13ZM10 4h4v16h-4zM16 4h1.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H16z" />
        </>
      ) : null}
      {name === "link" ? (
        <>
          <path d="M9.5 14.5 14.5 9.5" />
          <path d="M10.8 7.2 12 6a4 4 0 0 1 5.7 5.7l-1.2 1.2M13.2 16.8 12 18a4 4 0 0 1-5.7-5.7l1.2-1.2" />
        </>
      ) : null}
      {name === "part" ? (
        <>
          <path d="M7 7h10v10H7z" />
          <path d="M4 10h3M17 10h3M4 14h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3" />
        </>
      ) : null}
      {name === "pull" ? (
        <>
          <path d="M12 4v10" />
          <path d="m8 10 4 4 4-4" />
          <path d="M5 18h14" />
        </>
      ) : null}
      {name === "role" ? (
        <>
          <path d="M12 3.5 19 6v5.2c0 4.3-2.8 7.5-7 9.3-4.2-1.8-7-5-7-9.3V6l7-2.5Z" />
          <circle cx="12" cy="10" r="2.2" />
          <path d="M8.8 16a3.8 3.8 0 0 1 6.4 0" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="10.5" cy="10.5" r="5.5" />
          <path d="m15 15 4 4" />
        </>
      ) : null}
      {name === "select" ? (
        <>
          <path d="M5 5h14v14H5z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </>
      ) : null}
      {name === "sun" ? (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
        </>
      ) : null}
      {name === "tag" ? (
        <>
          <path d="M4 12.5 11.5 20 20 11.5V5h-6.5L4 14.5v-2Z" />
          <circle cx="15.5" cy="8.5" r="1" />
        </>
      ) : null}
      {name === "text" ? (
        <>
          <path d="M5 6h14M12 6v12M9 18h6" />
        </>
      ) : null}
      {name === "upload" ? (
        <>
          <path d="M12 20V9" />
          <path d="m8 13 4-4 4 4" />
          <path d="M5 20h14M6 5h12" />
        </>
      ) : null}
      {name === "user" ? (
        <>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </>
      ) : null}
    </svg>
  );
}

export default function OnshapeDesignAppPage() {
  const [context, setContext] = useState<OnshapeContext | null>(null);
  const [token, setToken] = useState("");
  const [state, setState] = useState<ConnectionState>("checking");
  const [status, setStatus] = useState("Reading Onshape context...");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastPart, setLastPart] = useState<PublishedPart | null>(null);
  const [stepFile, setStepFile] = useState<UploadedDesignFile | null>(null);
  const [stlFile, setStlFile] = useState<UploadedDesignFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedDesignFile | null>(
    null,
  );
  const [propertiesFile, setPropertiesFile] =
    useState<UploadedDesignFile | null>(null);
  const [onshapeApiConnected, setOnshapeApiConnected] = useState(false);
  const [libraryItems, setLibraryItems] = useState<PublishedPart[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState("all");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [libraryProcess, setLibraryProcess] = useState("all");
  const [libraryProjectId, setLibraryProjectId] = useState("all");
  const [libraryProjects, setLibraryProjects] = useState<LibraryProject[]>([]);
  const [librarySort, setLibrarySort] = useState<LibrarySort>("recent");
  const [expandedLibraryPartIds, setExpandedLibraryPartIds] = useState<string[]>(
    [],
  );
  const [libraryCompareSelection, setLibraryCompareSelection] = useState<
    PublishedPart[]
  >([]);
  const [libraryCompareResult, setLibraryCompareResult] =
    useState<LibraryCompareResult | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [activeTab, setActiveTab] = useState<ActiveTab>("connect");
  const [resolvedPart, setResolvedPart] = useState<OnshapeResolvedPart | null>(
    null,
  );
  const [partName, setPartName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [description, setDescription] = useState("");
  const [processType, setProcessType] = useState("");
  const [material, setMaterial] = useState("");
  const [revisionScheme, setRevisionScheme] = useState<"alphabetic" | "numeric">(
    "alphabetic",
  );
  const [revisionNote, setRevisionNote] = useState("");
  const [statusValue, setStatusValue] = useState("draft");
  const [category, setCategory] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("new_family");
  const [publishStatus, setPublishStatus] = useState<PublishStatus>("idle");
  const [publishWarning, setPublishWarning] = useState("");
  const [publishSteps, setPublishSteps] = useState<PublishStep[]>([]);
  const [lastPublishedFingerprint, setLastPublishedFingerprint] = useState("");
  const [publishMatches, setPublishMatches] = useState<PublishedPart[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PublishedPart | null>(null);
  const [newFamilyMatchOverrideKey, setNewFamilyMatchOverrideKey] = useState("");
  const [pullPackage, setPullPackage] = useState<PullPackage | null>(null);
  const [compareSummary, setCompareSummary] =
    useState<CompareStatusPayload | null>(null);
  const [compareStepPackage, setCompareStepPackage] =
    useState<CompareStepPackage | null>(null);
  const [compareWorkspace, setCompareWorkspace] =
    useState<CompareWorkspacePayload | null>(null);
  const publishInFlightRef = useRef(false);

  const storageKey = useMemo(
    () => (context ? contextStorageKey(context) : ""),
    [context],
  );
  const publishableContext = hasPublishableOnshapeContext(context);
  const onshapeDocumentId = context?.documentId ?? "";
  const onshapeElementId = context?.elementId ?? "";
  const onshapeServer = context?.server ?? "https://cad.onshape.com";
  const onshapeWorkspaceId = context?.workspaceId ?? "";
  const onshapeWorkspaceOrVersion = context?.workspaceOrVersion ?? "";
  const onshapeWorkspaceOrVersionId = context?.workspaceOrVersionId ?? "";
  const onshapeOrigin = useMemo(() => {
    try {
      return new URL(onshapeServer).origin;
    } catch {
      return "https://cad.onshape.com";
    }
  }, [onshapeServer]);
  const editableWorkspaceId =
    onshapeWorkspaceId ||
    (onshapeWorkspaceOrVersion === "w" ? onshapeWorkspaceOrVersionId : "");
  const publishMatchKey = useMemo(
    () =>
      [
        context?.documentId ?? "",
        context?.elementId ?? "",
        partName.trim().toLowerCase(),
        partNumber.trim().toLowerCase(),
      ].join("|"),
    [context?.documentId, context?.elementId, partName, partNumber],
  );
  const focusOnshapeElement = useCallback(
    function focusOnshapeElement(elementId?: string | null) {
      const nextElementId = elementId?.trim();
      if (!nextElementId || typeof window === "undefined") return false;

      const message = {
        documentId: onshapeDocumentId,
        workspaceId: editableWorkspaceId,
        elementId: onshapeElementId,
        messageName: "openAnotherElementInCurrentWorkspace",
        anotherElementId: nextElementId,
      };

      window.parent.postMessage(message, onshapeOrigin);
      window.setTimeout(() => {
        window.parent.postMessage(message, onshapeOrigin);
      }, 600);

      return true;
    },
    [editableWorkspaceId, onshapeDocumentId, onshapeElementId, onshapeOrigin],
  );
  const buildPublishFingerprint = useCallback(
    (
      mode = publishMode,
      targetPartId = mode === "new_revision" ? selectedMatch?.part_id ?? "" : "",
    ) =>
      [
        context?.documentId ?? "",
        context?.elementId ?? "",
        context?.microversionId ?? "",
        mode,
        targetPartId,
        partName.trim(),
        partNumber.trim(),
        material.trim(),
        processType,
        category,
      ].join("|"),
    [
      category,
      context?.documentId,
      context?.elementId,
      context?.microversionId,
      material,
      partName,
      partNumber,
      processType,
      publishMode,
      selectedMatch?.part_id,
    ],
  );
  const publishFingerprint = useMemo(
    () => buildPublishFingerprint(),
    [buildPublishFingerprint],
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setPublishMatches([]);
    setNewFamilyMatchOverrideKey("");
  }, [publishMatchKey]);

  const callOnshapeApi = useCallback(
    async function callOnshapeApi<T>(
      path: string,
      options: RequestInit = {},
      activeToken = token,
    ) {
      const headers = {
        ...getAuthHeaders(activeToken),
        ...(options.headers ?? {}),
      };

      const response = await fetch(path, {
        ...options,
        headers,
      });
      const payload = (await response.json().catch(() => ({}))) as T & {
        ok?: boolean;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        throw new Error("Kordyne session expired. Connect to Kordyne again.");
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "Kordyne request failed.");
      }

      return payload;
    },
    [token],
  );

  const loadProfile = useCallback(
    async function loadProfile(activeToken: string) {
      const payload = await callOnshapeApi<UserProfile & { ok: boolean }>(
        "/api/design-app/onshape/me",
        { method: "GET" },
        activeToken,
      );

      setProfile(payload);
      setOnshapeApiConnected(Boolean(payload.onshape?.oauth_connected));
      setState("connected");
      setStatus(
        payload.onshape?.oauth_connected
          ? "Connected to Kordyne and Onshape API."
          : "Connected to Kordyne. Connect Onshape API to export CAD data.",
      );
      setActiveTab("publish");
      return payload;
    },
    [callOnshapeApi],
  );

  const loadOnshapePartContext = useCallback(
    async function loadOnshapePartContext(activeToken = token, silent = false) {
      if (!context || !activeToken || !hasPublishableOnshapeContext(context)) {
        return null;
      }

      if (!silent) {
        setState("working");
        setStatus("Reading Onshape part context...");
      }

      const response = await fetch("/api/design-app/onshape/context", {
        method: "POST",
        headers: getAuthHeaders(activeToken),
        body: JSON.stringify(context),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        active_part?: OnshapeResolvedPart | null;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        return null;
      }

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        if (!silent) {
          setState("connected");
          setStatus("Reconnect Onshape API access to read part metadata.");
        }
        return null;
      }

      if (!response.ok || !payload.ok) {
        if (!silent) {
          setState("error");
          setStatus(payload.error || "Could not read Onshape part metadata.");
        }
        return null;
      }

      const activePart = payload.active_part ?? null;
      setResolvedPart(activePart);

      if (activePart) {
        setContext((current) =>
          current
            ? {
                ...current,
                partId: activePart.partId || current.partId,
                partNumber: activePart.partNumber || current.partNumber,
                partName: activePart.name || current.partName,
                revision: activePart.revision || current.revision,
                microversionId:
                  activePart.microversionId || current.microversionId,
              }
            : current,
        );
        setPartName((current) =>
          current &&
          current !== displayNameForContext(context) &&
          current !== context.partNumber &&
          !current.startsWith("Onshape element") &&
          !current.startsWith("Onshape document") &&
          !current.startsWith("Onshape part")
            ? current
            : activePart.name || current,
        );
        setPartNumber((current) => current || activePart.partNumber || "");
        setDescription((current) => current || activePart.description || "");
      }

      if (!silent) {
        setState("connected");
        setStatus(
          activePart?.name
            ? `Loaded Onshape part metadata for ${activePart.name}.`
            : "No individual Onshape part metadata was available.",
        );
      }

      return activePart;
    },
    [context, token],
  );

  const prepareOnshapeCheckpoint = useCallback(
    async function prepareOnshapeCheckpoint(actionLabel: string) {
      if (
        !publishableContext ||
        !onshapeDocumentId ||
        !editableWorkspaceId ||
        !onshapeElementId
      ) {
        return;
      }

      setStatus(`${actionLabel}: confirming latest Onshape cloud state...`);

      window.parent.postMessage(
        {
          documentId: onshapeDocumentId,
          workspaceId: editableWorkspaceId,
          elementId: onshapeElementId,
          messageName: "requestSelection",
        },
        onshapeOrigin,
      );

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 550);
      });

      if (token && onshapeApiConnected) {
        await loadOnshapePartContext(token, true).catch(() => null);
      }
    },
    [
      editableWorkspaceId,
      loadOnshapePartContext,
      onshapeApiConnected,
      onshapeDocumentId,
      onshapeElementId,
      onshapeOrigin,
      publishableContext,
      token,
    ],
  );

  function updatePublishStep(
    id: PublishStepId,
    status: PublishStepStatus,
    detail?: string,
  ) {
    setPublishSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              status,
              detail,
            }
          : step,
      ),
    );
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedContext = parseOnshapeContext();
      setContext(parsedContext);
      setLibraryQuery("");
      setPartName((current) => current || displayNameForContext(parsedContext));
      setPartNumber((current) => current || parsedContext.partNumber || "");
      setRevisionNote("Published from Onshape.");

      const savedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
      const savedPartRaw = window.localStorage.getItem(
        contextStorageKey(parsedContext),
      );

      if (savedPartRaw) {
        try {
          setLastPart(JSON.parse(savedPartRaw) as PublishedPart);
        } catch {
          window.localStorage.removeItem(contextStorageKey(parsedContext));
        }
      }

      if (!savedToken) {
        setState("not_connected");
        setStatus("Connect to Kordyne to publish this Onshape context.");
        return;
      }

      setToken(savedToken);
      void loadProfile(savedToken).catch((error) => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setOnshapeApiConnected(false);
        setState("not_connected");
        setStatus(
          error instanceof Error
            ? error.message
            : "Connect to Kordyne to continue.",
        );
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    if (!publishableContext) return;

    const workspaceId = onshapeWorkspaceId || onshapeWorkspaceOrVersionId;
    if (!onshapeDocumentId || !workspaceId || !onshapeElementId) return;

    let expectedOrigin = "";
    try {
      expectedOrigin = new URL(onshapeServer).origin;
    } catch {
      expectedOrigin = "https://cad.onshape.com";
    }

    const baseMessage = {
      documentId: onshapeDocumentId,
      workspaceId,
      elementId: onshapeElementId,
    };

    function handleOnshapeMessage(event: MessageEvent) {
      if (expectedOrigin && event.origin !== expectedOrigin) return;
      const data = event.data as
        | {
            messageName?: string;
            selections?: Array<{
              workspaceMicroversionId?: string;
            }>;
          }
        | null;

      if (data?.messageName !== "SELECTION" || !data.selections?.length) {
        return;
      }

      const workspaceMicroversionId =
        data.selections[0]?.workspaceMicroversionId?.trim() ?? "";
      if (!workspaceMicroversionId) return;

      setContext((current) =>
        current
          ? { ...current, microversionId: workspaceMicroversionId }
          : current,
      );
    }

    window.addEventListener("message", handleOnshapeMessage);
    window.parent.postMessage(
      { ...baseMessage, messageName: "applicationInit" },
      expectedOrigin,
    );
    window.parent.postMessage(
      { ...baseMessage, messageName: "requestSelection" },
      expectedOrigin,
    );

    return () => window.removeEventListener("message", handleOnshapeMessage);
  }, [
    onshapeDocumentId,
    onshapeElementId,
    onshapeServer,
    onshapeWorkspaceId,
    onshapeWorkspaceOrVersion,
    onshapeWorkspaceOrVersionId,
    publishableContext,
  ]);

  useEffect(() => {
    if (!storageKey || !lastPart) return;
    window.localStorage.setItem(storageKey, JSON.stringify(lastPart));
  }, [lastPart, storageKey]);

  useEffect(() => {
    setPullPackage(null);
    setCompareSummary(null);
    setCompareStepPackage(null);
    setCompareWorkspace(null);
    setLibraryCompareResult(null);
  }, [lastPart?.part_id]);

  useEffect(() => {
    setPublishStatus("idle");
    setPublishWarning("");
    setPublishSteps([]);
  }, [context?.documentId, context?.elementId, partName, partNumber]);

  useEffect(() => {
    if (!token || !onshapeApiConnected || !publishableContext) return;
    if (resolvedPart?.partId && resolvedPart.elementId === context?.elementId) return;

    void loadOnshapePartContext(token, true);
  }, [
    context?.elementId,
    loadOnshapePartContext,
    onshapeApiConnected,
    publishableContext,
    resolvedPart?.elementId,
    resolvedPart?.partId,
    token,
  ]);

  async function connect() {
    setState("opening_browser");
    setStatus("Opening Kordyne login...");

    const startResponse = await fetch("/api/design-app/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientType: "onshape" }),
    });

    const startPayload = (await startResponse.json()) as {
      ok?: boolean;
      code?: string;
      client_verifier?: string;
      browser_url?: string;
      error?: string;
    };

    if (
      !startResponse.ok ||
      !startPayload.ok ||
      !startPayload.code ||
      !startPayload.client_verifier ||
      !startPayload.browser_url
    ) {
      setState("error");
      setStatus(startPayload.error ?? "Could not start Kordyne login.");
      return;
    }

    window.open(startPayload.browser_url, "_blank", "noopener,noreferrer");
    setState("waiting");
    setStatus("Approve the browser login, then return here.");

    const startedAt = Date.now();
    const poll = window.setInterval(async () => {
      if (Date.now() - startedAt > 10 * 60 * 1000) {
        window.clearInterval(poll);
        setState("error");
        setStatus("Login timed out. Start the connection again.");
        return;
      }

      const exchangeResponse = await fetch("/api/design-app/auth/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: startPayload.code,
          clientVerifier: startPayload.client_verifier,
        }),
      });

      const exchangePayload = (await exchangeResponse.json()) as {
        ok?: boolean;
        access_token?: string;
        status?: string;
        error?: string;
      };

      if (exchangePayload.status === "pending") return;

      if (!exchangeResponse.ok || !exchangePayload.ok || !exchangePayload.access_token) {
        window.clearInterval(poll);
        setState("error");
        setStatus(exchangePayload.error ?? "Kordyne login failed.");
        return;
      }

      window.clearInterval(poll);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, exchangePayload.access_token);
      setToken(exchangePayload.access_token);
      await loadProfile(exchangePayload.access_token);
    }, 1500);
  }

  async function connectOnshapeApi() {
    if (!token) {
      setStatus("Connect to Kordyne before connecting Onshape API access.");
      return;
    }

    setState("opening_browser");
    setStatus("Opening Onshape authorization...");

    try {
      const payload = await callOnshapeApi<{
        ok: boolean;
        authorization_url: string;
      }>("/api/design-app/onshape/oauth/start", {
        method: "POST",
        body: JSON.stringify({
          return_path: window.location.pathname + window.location.search,
          context: {
            companyId: context?.companyId || null,
          },
        }),
      });

      window.open(payload.authorization_url, "_blank", "noopener,noreferrer");
      setState("waiting");
      setStatus("Approve Onshape access, then return here.");

      const startedAt = Date.now();
      const poll = window.setInterval(async () => {
        if (Date.now() - startedAt > 3 * 60 * 1000) {
          window.clearInterval(poll);
          setState("connected");
          setStatus("Onshape authorization is still pending.");
          return;
        }

        try {
          const nextProfile = await loadProfile(token);
          if (nextProfile.onshape?.oauth_connected) {
            window.clearInterval(poll);
            setState("connected");
            setStatus("Onshape API access connected.");
            void loadOnshapePartContext(token, true);
          }
        } catch {
          // Keep polling while the authorization tab is still in progress.
        }
      }, 2000);
    } catch (error) {
      setState("error");
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not start Onshape authorization.",
      );
    }
  }

  async function exportStepFromOnshape(silent = false) {
    if (!context || !token) return null;

    if (!silent) {
      setState("working");
      setStatus("Exporting STEP from Onshape...");
    }

    try {
      const response = await fetch("/api/design-app/onshape/export-step", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...context,
          partNumber: partNumber || context.partNumber,
          externalName: partName || displayNameForContext(context),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        return null;
      }

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        setState("connected");
        setStatus(payload.error || "Reconnect Onshape API access before exporting STEP.");
        return null;
      }

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "Onshape STEP export failed.");
      }

      setStepFile(payload.file);
      setOnshapeApiConnected(true);
      setState("connected");
      setStatus(payload.message || "Onshape STEP export attached.");
      return payload.file;
    } catch (error) {
      setState("error");
      setStatus(
        error instanceof Error ? error.message : "Onshape STEP export failed.",
      );
      return null;
    }
  }

  async function exportStlFromOnshape(silent = false) {
    if (!context || !token) return null;

    if (!silent) {
      setState("working");
      setStatus("Exporting STL viewer geometry from Onshape...");
    }

    try {
      const response = await fetch("/api/design-app/onshape/export-stl", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...context,
          partNumber: partNumber || context.partNumber,
          externalName: partName || displayNameForContext(context),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        return null;
      }

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        setState("connected");
        setStatus(payload.error || "Reconnect Onshape API access before exporting STL.");
        return null;
      }

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "Onshape STL export failed.");
      }

      setStlFile(payload.file);
      setOnshapeApiConnected(true);
      setState("connected");
      setStatus(payload.message || "Onshape STL viewer export attached.");
      return payload.file;
    } catch (error) {
      setState("error");
      setStatus(
        error instanceof Error ? error.message : "Onshape STL export failed.",
      );
      return null;
    }
  }

  async function exportThumbnailFromOnshape(silent = false) {
    if (!context || !token) return null;

    if (!silent) {
      setState("working");
      setStatus("Capturing Onshape preview...");
    }

    try {
      const response = await fetch("/api/design-app/onshape/export-thumbnail", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...context,
          partNumber: partNumber || context.partNumber,
          externalName: partName || displayNameForContext(context),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        return null;
      }

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        setState("connected");
        setStatus(
          payload.error ||
            "Reconnect Onshape API access before capturing a preview.",
        );
        return null;
      }

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "Onshape preview capture failed.");
      }

      setThumbnailFile(payload.file);
      setOnshapeApiConnected(true);
      setState("connected");
      setStatus(payload.message || "Onshape preview attached.");
      return payload.file;
    } catch (error) {
      if (!silent) {
        setState("error");
        setStatus(
          error instanceof Error
            ? error.message
            : "Onshape preview capture failed.",
        );
      }

      return null;
    }
  }

  async function exportPropertiesFromOnshape(silent = false) {
    if (!context || !token) return null;

    if (!silent) {
      setState("working");
      setStatus("Saving Onshape part properties...");
    }

    try {
      const response = await fetch("/api/design-app/onshape/export-properties", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...context,
          partNumber: partNumber || context.partNumber,
          externalName: partName || displayNameForContext(context),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (response.status === 401) {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken("");
        setProfile(null);
        setOnshapeApiConnected(false);
        setPublishStatus("idle");
        setPublishWarning("");
        setState("not_connected");
        setStatus("Kordyne session expired. Connect to Kordyne again.");
        return null;
      }

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        setState("connected");
        setStatus(
          payload.error ||
            "Reconnect Onshape API access before saving part properties.",
        );
        return null;
      }

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "Onshape property export failed.");
      }

      setPropertiesFile(payload.file);
      setOnshapeApiConnected(true);
      setState("connected");
      setStatus(payload.message || "Onshape properties text file attached.");
      return payload.file;
    } catch (error) {
      if (!silent) {
        setState("error");
        setStatus(
          error instanceof Error
            ? error.message
            : "Onshape property export failed.",
        );
      }

      return null;
    }
  }

  async function findPotentialPublishMatches() {
    if (!token) return [];

    const query = partName || partNumber;
    if (!query.trim()) return [];

    const payload = await callOnshapeApi<{
      ok: boolean;
      items: Array<PublishedPart>;
    }>("/api/design-app/onshape/library-search", {
      method: "POST",
      body: JSON.stringify({
        q: query,
        limit: 10,
      }),
    });

    const exactMatches = payload.items.filter((item) => {
      const itemName = (item.name ?? "").trim().toLowerCase();
      const itemNumber = (item.part_number ?? "").trim().toLowerCase();
      const cleanName = partName.trim().toLowerCase();
      const cleanNumber = partNumber.trim().toLowerCase();

      return (
        (cleanNumber && itemNumber === cleanNumber) ||
        (cleanName && itemName === cleanName) ||
        (item.search_score ?? 0) >= 90
      );
    });

    setPublishMatches(exactMatches);
    return exactMatches;
  }

  async function publish(
    decision?: {
      mode: PublishMode;
      match?: PublishedPart | null;
      allowSeparateNewPart?: boolean;
    },
  ) {
    if (!context || !token) return;
    if (publishInFlightRef.current) return;

    const effectiveMode = decision?.mode ?? publishMode;
    const effectiveTargetMatch =
      effectiveMode === "new_revision"
        ? decision?.match || selectedMatch || lastPart || null
        : null;
    const allowSeparateNewPart =
      Boolean(decision?.allowSeparateNewPart) ||
      (effectiveMode === "new_family" &&
        newFamilyMatchOverrideKey === publishMatchKey);
    const effectiveFingerprint = buildPublishFingerprint(
      effectiveMode,
      effectiveTargetMatch?.part_id ?? "",
    );

    if (
      lastPublishedFingerprint &&
      lastPublishedFingerprint === effectiveFingerprint
    ) {
      setStatus("This package was already saved to Kordyne.");
      return;
    }

    publishInFlightRef.current = true;
    setPublishStatus("checking");
    setPublishWarning("");
    setPublishSteps([]);
    setStatus("Checking Vault target before publishing...");

    try {
      if (!partName.trim()) {
        setPublishStatus("idle");
        setState("error");
        setStatus("Part Name is required before publishing.");
        return;
      }

      const targetMatch = effectiveTargetMatch;

      if (effectiveMode === "new_family" && !allowSeparateNewPart) {
        setStatus("Checking Vault for existing Kordyne parts...");
        const matches = await findPotentialPublishMatches();
        if (matches.length > 0) {
          setPublishStatus("idle");
          setState("connected");
          setStatus(
            "Possible existing Kordyne part found. Choose the matching Vault part or confirm a separate new part before publishing.",
          );
          setActiveTab("publish");
          return;
        }
      }

      if (effectiveMode === "new_revision" && !targetMatch) {
        setStatus("Choose which existing Kordyne part should receive the next revision...");
        const matches = await findPotentialPublishMatches();
        if (matches.length > 0) {
          setPublishStatus("idle");
          setState("connected");
          setActiveTab("publish");
          return;
        }
      }

      if (effectiveMode === "new_revision" && !targetMatch?.part_id) {
        setPublishStatus("idle");
        setState("error");
        setStatus("Select an existing Kordyne part before publishing a revision.");
        return;
      }

      setPublishMode(effectiveMode);
      if (effectiveMode === "new_revision" && targetMatch) {
        setSelectedMatch(targetMatch);
        setLastPart(targetMatch);
        setNewFamilyMatchOverrideKey("");
      }
      if (effectiveMode === "new_family" && allowSeparateNewPart) {
        setSelectedMatch(null);
        setNewFamilyMatchOverrideKey(publishMatchKey);
      }
      setPublishMatches([]);
      setState("working");
      setPublishStatus("saving");
      setPublishSteps(initialPublishSteps());
      setStatus("Saving package: checking Onshape and Kordyne data...");

      updatePublishStep("checkpoint", "active", "Confirming latest cloud state");
      await prepareOnshapeCheckpoint("Publish");
      updatePublishStep("checkpoint", "done", "Latest state confirmed");

      let publishStlFile = stlFile;
      if (!publishStlFile) {
        updatePublishStep("stl", "active", "Exporting viewer geometry");
        setStatus("Saving package: exporting STL viewer geometry...");
        publishStlFile = await exportStlFromOnshape(true);
      }

      if (!publishStlFile) {
        updatePublishStep("stl", "warning", "STL was not returned");
        setPublishWarning(
          onshapeApiConnected
            ? "Onshape did not return STL viewer geometry. Kordyne will still publish the package, but browser preview may fall back to controlled STEP preparation."
            : "Reconnect Onshape API access so Kordyne can export STL viewer geometry automatically.",
        );
      } else {
        updatePublishStep("stl", "done", publishStlFile.filename);
      }

      let publishStepFile = stepFile;
      if (!publishStepFile) {
        updatePublishStep("step", "active", "Converting exchange file");
        setStatus("Saving package: exporting STEP from Onshape...");
        publishStepFile = await exportStepFromOnshape(true);
      }

      if (!publishStepFile) {
        updatePublishStep("step", "error", "STEP export failed");
        setPublishStatus("idle");
        setState("connected");
        setStatus(
          onshapeApiConnected
            ? "STEP export was not attached. Check Onshape API access and try again."
            : "Reconnect Onshape API access so Kordyne can export STEP automatically.",
        );
        return;
      }
      updatePublishStep("step", "done", publishStepFile.filename);

      let publishPropertiesFile = propertiesFile;
      if (!publishPropertiesFile) {
        updatePublishStep("properties", "active", "Saving mass properties");
        setStatus("Saving package: exporting part properties...");
        publishPropertiesFile = await exportPropertiesFromOnshape(true);
      }

      if (!publishPropertiesFile) {
        updatePublishStep("properties", "warning", "Properties unavailable");
      } else {
        updatePublishStep("properties", "done", publishPropertiesFile.filename);
      }

      let publishThumbnailFile = thumbnailFile;
      if (!publishThumbnailFile) {
        updatePublishStep("preview", "active", "Capturing thumbnail");
        setStatus("Saving package: capturing Onshape preview...");
        publishThumbnailFile = await exportThumbnailFromOnshape(true);
      }

      if (!publishThumbnailFile) {
        updatePublishStep("preview", "warning", "Preview unavailable");
        setPublishWarning(
          onshapeApiConnected
            ? "Onshape did not return a preview image. Kordyne will publish the CAD package now and the thumbnail can be refreshed later."
            : "Onshape API access needs reconnecting before Kordyne can refresh the preview thumbnail.",
        );
      } else {
        updatePublishStep("preview", "done", publishThumbnailFile.filename);
      }

      setState("working");
      setPublishStatus("publishing");
      updatePublishStep("package", "active", "Creating Vault record");
      setStatus(
        effectiveMode === "new_revision"
          ? "Publishing package: creating next Kordyne revision..."
          : "Publishing package: creating Kordyne part...",
      );

      const publishFiles = publishThumbnailFile
        ? [
            publishStepFile,
            ...(publishStlFile ? [publishStlFile] : []),
            ...(publishPropertiesFile ? [publishPropertiesFile] : []),
            publishThumbnailFile,
          ]
        : [
            publishStepFile,
            ...(publishStlFile ? [publishStlFile] : []),
            ...(publishPropertiesFile ? [publishPropertiesFile] : []),
          ];

      const payload = await callOnshapeApi<{
        ok: boolean;
        part_id: string;
        part_family_id: string;
        name: string | null;
        part_number?: string | null;
        revision: string | null;
        status: string | null;
        message?: string;
      }>("/api/design-app/onshape/publish", {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: randomIdempotencyKey(),
          part_id: effectiveMode === "new_revision" ? targetMatch?.part_id : null,
          external_workspace_id: context.workspaceId || null,
          external_project_id: context.companyId || null,
          external_document_id: context.documentId || null,
          external_item_id:
            context.elementId || context.tabElementId || context.partId || null,
          external_version_id:
            context.microversionId || context.versionId || null,
          external_revision_id: context.revision || null,
          external_name: partName || displayNameForContext(context),
          external_url: context.externalUrl || null,
          metadata: {
            publish_mode: effectiveMode,
            name: partName.trim(),
            part_number: partNumber.trim() || null,
            description: description.trim() || null,
            process_type: processType || null,
            material: material.trim() || null,
            revision_scheme: effectiveMode === "new_family" ? revisionScheme : null,
            category: category || null,
            status: statusValue,
            revision_note: revisionNote.trim() || "Published from Onshape.",
            cad_metadata: {
              ...context,
              resolved_part: resolvedPart,
              native_source: "onshape_document_reference",
              step_storage_path: publishStepFile.storage_path,
              stl_storage_path: publishStlFile?.storage_path ?? null,
              properties_storage_path:
                publishPropertiesFile?.storage_path ?? null,
              thumbnail_storage_path: publishThumbnailFile?.storage_path ?? null,
              thumbnail_filename: publishThumbnailFile?.filename ?? null,
            },
          },
          files: publishFiles,
        }),
      });

      const nextPart = {
        part_id: payload.part_id,
        part_family_id: payload.part_family_id,
        name: payload.name,
        part_number: payload.part_number ?? partNumber,
        revision: payload.revision,
        status: payload.status,
      };

      setLastPart(nextPart);
      setSelectedMatch(nextPart);
      setPublishMode("new_revision");
      setPublishMatches([]);
      setLibraryLoaded(false);
      setState("connected");
      setPublishStatus("published");
      setLastPublishedFingerprint(effectiveFingerprint);
      updatePublishStep("package", "done", "Package saved in Kordyne");
      setStatus(
        payload.revision
          ? `Package saved in Kordyne as revision ${payload.revision}.`
          : "Package saved in Kordyne.",
      );
      window.setTimeout(() => {
        setPublishSteps([]);
      }, 3500);
    } catch (error) {
      setPublishStatus("idle");
      setState("error");
      setPublishSteps((current) =>
        current.map((step) =>
          step.status === "active"
            ? { ...step, status: "error", detail: "Stopped" }
            : step,
        ),
      );
      setStatus(error instanceof Error ? error.message : "Publish failed.");
    } finally {
      publishInFlightRef.current = false;
    }
  }

  function toggleLibraryRevisionList(partId: string) {
    setExpandedLibraryPartIds((current) =>
      current.includes(partId)
        ? current.filter((id) => id !== partId)
        : [...current, partId],
    );
  }

  function toggleLibraryCompareSelection(part: PublishedPart) {
    setLibraryCompareResult(null);
    setLibraryCompareSelection((current) => {
      if (current.some((item) => item.part_id === part.part_id)) {
        return current.filter((item) => item.part_id !== part.part_id);
      }

      return [...current.slice(-1), part];
    });
  }

  async function importLibraryComparePart(part: PublishedPart) {
    const payload = await callOnshapeApi<PullPackage>(
      "/api/design-app/onshape/pull-package",
      {
        method: "POST",
        body: JSON.stringify({ part_id: part.part_id }),
      },
    );
    const stepFile = primaryStepFile(payload.step_files);

    if (!stepFile?.file_id) {
      throw new Error(
        `${partDisplayName(part)} ${revisionDisplay(part)} does not have a STEP file available for Onshape comparison.`,
      );
    }

    const imported = await callOnshapeApi<ImportStepPayload>(
      "/api/design-app/onshape/import-step",
      {
        method: "POST",
        body: JSON.stringify({
          mode: "current_document",
          part_id: part.part_id,
          file_id: stepFile.file_id,
          import_name: partDisplayName(part),
          documentId: onshapeDocumentId,
          workspaceId: editableWorkspaceId,
          workspaceOrVersion: onshapeWorkspaceOrVersion,
          workspaceOrVersionId: onshapeWorkspaceOrVersionId,
        }),
      },
    );

    return { part, stepFile, imported };
  }

  async function compareLibrarySelection() {
    if (libraryCompareSelection.length !== 2) {
      setStatus("Select two library revisions to compare.");
      return;
    }

    if (!onshapeDocumentId || !editableWorkspaceId) {
      setStatus(
        "Open this app from an editable Onshape workspace before running a library-to-library compare.",
      );
      return;
    }

    const [leftPart, rightPart] = libraryCompareSelection;

    setState("working");
    setLibraryCompareResult(null);
    setCompareWorkspace(null);
    setStatus("Importing both Kordyne STEP files into this Onshape document...");

    try {
      await prepareOnshapeCheckpoint("Library compare");
      const left = await importLibraryComparePart(leftPart);
      const right = await importLibraryComparePart(rightPart);
      const leftSize = left.stepFile.size_bytes;
      const rightSize = right.stepFile.size_bytes;
      const fileSizeDeltaBytes =
        typeof leftSize === "number" && typeof rightSize === "number"
          ? Math.abs(leftSize - rightSize)
          : null;

      setLibraryCompareResult({ left, right, fileSizeDeltaBytes });
      let workspace: CompareWorkspacePayload | null = null;

      try {
        workspace = await callOnshapeApi<CompareWorkspacePayload>(
          "/api/design-app/onshape/compare-workspace",
          {
            method: "POST",
            body: JSON.stringify({
              documentId: onshapeDocumentId,
              workspaceId: editableWorkspaceId,
              imports: [
                {
                  label: "Library A",
                  documentId: left.imported.onshape.document_id,
                  workspaceId: left.imported.onshape.workspace_id,
                  elementId: left.imported.onshape.element_id,
                  name: partDisplayName(left.part),
                  revision: left.part.revision,
                  material: left.part.material,
                  process_type: left.part.process_type,
                  file_name: left.stepFile.filename,
                  file_size_bytes: left.stepFile.size_bytes ?? null,
                },
                {
                  label: "Library B",
                  documentId: right.imported.onshape.document_id,
                  workspaceId: right.imported.onshape.workspace_id,
                  elementId: right.imported.onshape.element_id,
                  name: partDisplayName(right.part),
                  revision: right.part.revision,
                  material: right.part.material,
                  process_type: right.part.process_type,
                  file_name: right.stepFile.filename,
                  file_size_bytes: right.stepFile.size_bytes ?? null,
                },
              ],
            }),
          },
        );
        setCompareWorkspace(workspace);
      } catch {
        workspace = null;
      }

      setState("connected");
      setActiveTab("compare");

      const switched =
        focusOnshapeElement(workspace?.assembly?.element_id) ||
        focusOnshapeElement(right.imported.onshape.element_id) ||
        focusOnshapeElement(left.imported.onshape.element_id);

      setStatus(
        switched
          ? workspace?.assembly?.inserted_count
            ? "Imported both selected revisions and switched to the comparison assembly."
            : "Imported both selected revisions and switched to the newest comparison tab."
          : "Imported both selected revisions into this Onshape document for comparison.",
      );
    } catch (error) {
      setState("error");
      setStatus(
        error instanceof Error
          ? error.message
          : "Library comparison import failed.",
      );
    }
  }

  function linkLibraryPart(item: PublishedPart, tab: ActiveTab = "publish") {
    setLastPart(item);
    setSelectedMatch(item);
    setPublishMode("new_revision");
    setPartName((current) => item.name || current);
    setPartNumber((current) => item.part_number || current);
    setMaterial((current) => item.material || current);
    setProcessType((current) => item.process_type || current);
    setCategory((current) => item.category || current);
    setStatusValue((current) => item.status || current);
    setActiveTab(tab);
    setStatus("Linked this Onshape context to a Kordyne part.");
  }

  async function compare(sourcePart = lastPart) {
    if (!sourcePart?.part_id) {
      setStatus("Publish or link this Onshape context before compare.");
      return;
    }

    setState("working");
    setStatus("Checking Kordyne revision status...");
    setCompareSummary(null);
    setCompareStepPackage(null);
    setCompareWorkspace(null);

    try {
      setLastPart(sourcePart);
      setSelectedMatch(sourcePart);
      setPublishMode("new_revision");
      setActiveTab("compare");
      await prepareOnshapeCheckpoint("Compare");

      const payload = await callOnshapeApi<CompareStatusPayload>(
        "/api/design-app/onshape/compare-status",
        {
          method: "POST",
          body: JSON.stringify({ part_id: sourcePart.part_id }),
        },
      );

      setCompareSummary(payload);

      let stepPackage: CompareStepPackage | null = null;
      let stepWarning = "";

      try {
        stepPackage = await callOnshapeApi<CompareStepPackage>(
          "/api/design-app/onshape/compare-step-package",
          {
            method: "POST",
            body: JSON.stringify({ source_part_id: sourcePart.part_id }),
          },
        );
      } catch (stepError) {
        stepWarning =
          stepError instanceof Error
            ? ` ${stepError.message}`
            : " Latest STEP package is not available.";
      }

      setCompareStepPackage(stepPackage);

      let compareOpenMessage = "";
      let currentImport: ImportStepPayload | null = null;
      let latestImport: ImportStepPayload | null = null;
      let compareWorkspacePayload: CompareWorkspacePayload | null = null;

      if (onshapeDocumentId && editableWorkspaceId && onshapeApiConnected) {
        setStatus("Exporting current Onshape geometry for comparison...");
        const currentStep = await exportStepFromOnshape(true);

        if (currentStep?.storage_path) {
          setStatus("Importing current source as comparison baseline...");
          currentImport = await callOnshapeApi<ImportStepPayload>(
            "/api/design-app/onshape/import-step",
            {
              method: "POST",
              body: JSON.stringify({
                mode: "current_document",
                storage_path: currentStep.storage_path,
                filename: currentStep.filename,
                import_name: activePartName,
                mime_type: currentStep.mime_type,
                documentId: onshapeDocumentId,
                workspaceId: editableWorkspaceId,
                workspaceOrVersion: onshapeWorkspaceOrVersion,
                workspaceOrVersionId: onshapeWorkspaceOrVersionId,
              }),
            },
          );
        }
      }

      if (stepPackage?.step_file?.file_id && onshapeDocumentId && editableWorkspaceId) {
        setStatus("Importing latest Kordyne STEP into the active Onshape document...");

        latestImport = await callOnshapeApi<ImportStepPayload>(
          "/api/design-app/onshape/import-step",
          {
            method: "POST",
            body: JSON.stringify({
              mode: "current_document",
              part_id: stepPackage.latest.part_id,
              file_id: stepPackage.step_file.file_id,
              import_name: partDisplayName(stepPackage.latest),
              documentId: onshapeDocumentId,
              workspaceId: editableWorkspaceId,
              workspaceOrVersion: onshapeWorkspaceOrVersion,
              workspaceOrVersionId: onshapeWorkspaceOrVersionId,
            }),
          },
        );

        if (currentImport && latestImport) {
          try {
            compareWorkspacePayload = await callOnshapeApi<CompareWorkspacePayload>(
              "/api/design-app/onshape/compare-workspace",
              {
                method: "POST",
                body: JSON.stringify({
                  documentId: onshapeDocumentId,
                  workspaceId: editableWorkspaceId,
                  imports: [
                    {
                      label: "Current Onshape",
                      documentId: currentImport.onshape.document_id,
                      workspaceId: currentImport.onshape.workspace_id,
                      elementId: currentImport.onshape.element_id,
                      name: activePartName,
                      revision: activePartRevision || context?.revision || null,
                      material: material || sourcePart.material || null,
                      process_type: processType || sourcePart.process_type || null,
                      file_name: currentImport.file.filename,
                      file_size_bytes: currentImport.file.size_bytes ?? null,
                    },
                    {
                      label: "Kordyne latest",
                      documentId: latestImport.onshape.document_id,
                      workspaceId: latestImport.onshape.workspace_id,
                      elementId: latestImport.onshape.element_id,
                      name: partDisplayName(stepPackage.latest),
                      revision: stepPackage.latest.revision,
                      material: stepPackage.latest.material,
                      process_type: stepPackage.latest.process_type,
                      file_name: stepPackage.step_file.filename,
                      file_size_bytes: stepPackage.step_file.size_bytes ?? null,
                    },
                  ],
                }),
              },
            );
            setCompareWorkspace(compareWorkspacePayload);
          } catch {
            setCompareWorkspace(null);
          }
        }

        const switchedToImport =
          focusOnshapeElement(compareWorkspacePayload?.assembly?.element_id) ||
          focusOnshapeElement(latestImport.onshape.element_id);

        if (latestImport.onshape.open_url) {
          compareOpenMessage =
            switchedToImport
              ? " Latest STEP was imported and Onshape is switching to the comparison view."
              : " Latest STEP was imported into this Onshape document for visual review.";
        } else {
          compareOpenMessage =
            " Latest STEP was imported into this Onshape document, but Onshape did not return a direct tab URL.";
        }
      } else {
        if (stepPackage?.step_file?.signed_url) {
          compareOpenMessage =
            " Latest STEP is ready to download, but Kordyne needs an editable Onshape workspace to import it for review.";
        }
      }

      setState("connected");
      setStatus(
        payload.status.is_latest_revision
          ? `Current Kordyne source is latest revision ${payload.current.revision ?? ""}.${stepWarning}${compareOpenMessage}`
          : `Kordyne has newer revision ${payload.latest.revision ?? ""}.${stepWarning}${compareOpenMessage}`,
      );
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Compare failed.");
    }
  }

  async function pull(sourcePart = lastPart) {
    if (!sourcePart?.part_id) {
      setStatus("Publish or link a Kordyne part before pull.");
      return;
    }

    setState("working");
    setStatus("Preparing Kordyne pull package...");
    setPullPackage(null);

    try {
      setLastPart(sourcePart);
      setSelectedMatch(sourcePart);
      setPublishMode("new_revision");
      window.localStorage.setItem(
        HANDOFF_STORAGE_KEY,
        JSON.stringify({
          action: "pull",
          part_id: sourcePart.part_id,
          revision: sourcePart.revision ?? null,
          at: new Date().toISOString(),
        }),
      );
      await prepareOnshapeCheckpoint("Pull");

      const payload = await callOnshapeApi<PullPackage>(
        "/api/design-app/onshape/pull-package",
        {
          method: "POST",
          body: JSON.stringify({ part_id: sourcePart.part_id }),
        },
      );

      setPullPackage(payload);

      if (payload.open_action?.url) {
        const isCurrentOnshapeDocument =
          payload.source_link?.external_document_id &&
          payload.source_link.external_document_id === onshapeDocumentId;
        const switchedToNative =
          isCurrentOnshapeDocument &&
          focusOnshapeElement(
            payload.source_link?.focus_element_id ||
              payload.source_link?.external_item_id,
          );

        setState("connected");
        setActiveTab("publish");
        setStatus(
          switchedToNative
            ? `Switched to the native Onshape tab for Rev ${fieldOrDash(payload.part.revision)}. Publish is ready when you want to save back to Kordyne.`
            : isCurrentOnshapeDocument
              ? `Native Onshape source for Rev ${fieldOrDash(payload.part.revision)} is in this document, but Kordyne could not identify the exact Onshape tab to focus. Publish is ready when you return.`
            : `Native Onshape source is available for Rev ${fieldOrDash(payload.part.revision)}. Use the source link below if you need to open that document, then publish back from this panel.`,
        );
        return;
      }

      const primaryStep = payload.step_files[0];

      if (primaryStep?.file_id && onshapeDocumentId && editableWorkspaceId) {
        setStatus("Native Onshape source is not available. Importing STEP into this Onshape document...");

        const imported = await callOnshapeApi<ImportStepPayload>(
          "/api/design-app/onshape/import-step",
          {
            method: "POST",
            body: JSON.stringify({
              mode: "current_document",
              part_id: sourcePart.part_id,
              file_id: primaryStep.file_id,
              import_name:
                payload.part.name ||
                sourcePart.name ||
                sourcePart.part_number ||
                sourcePart.part_id,
              documentId: onshapeDocumentId,
              workspaceId: editableWorkspaceId,
              workspaceOrVersion: onshapeWorkspaceOrVersion,
              workspaceOrVersionId: onshapeWorkspaceOrVersionId,
            }),
          },
        );

        const switchedToImport = focusOnshapeElement(imported.onshape.element_id);

        if (imported.onshape.open_url) {
          setState("connected");
          setActiveTab("publish");
          setStatus(
            switchedToImport
              ? `Imported STEP for Rev ${fieldOrDash(payload.part.revision)} and switched to the new Onshape tab. Publish is ready when you want to save back to Kordyne.`
              : `Imported STEP for Rev ${fieldOrDash(payload.part.revision)} into this Onshape document. Use the new Onshape tab for edits, then publish back as a new revision.`,
          );
          return;
        }
      }

      setState("connected");
      setActiveTab("publish");
      setStatus(
        `Pull package ready: ${payload.availability.native_count} native reference${payload.availability.native_count === 1 ? "" : "s"}, ${payload.availability.step_count} STEP exchange file${payload.availability.step_count === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Pull failed.");
    }
  }

  async function searchLibrary() {
    setState("working");
    setStatus("Searching Kordyne library...");

    try {
      const payload = await callOnshapeApi<{
        ok: boolean;
        items: Array<PublishedPart>;
        projects?: LibraryProject[];
      }>("/api/design-app/onshape/library-search", {
        method: "POST",
        body: JSON.stringify({
          q: libraryQuery,
          limit: 100,
          status: libraryStatus,
          category: libraryCategory,
          process_type: libraryProcess,
          project_id: libraryProjectId,
          sort: librarySort,
        }),
      });

      setLibraryItems(payload.items);
      setLibraryProjects(payload.projects ?? []);
      setExpandedLibraryPartIds([]);
      setLibraryCompareSelection([]);
      setLibraryCompareResult(null);
      setLibraryLoaded(true);
      setState("connected");
      setStatus(
        payload.items.length > 0
          ? `Showing ${payload.items.length} Kordyne part${payload.items.length === 1 ? "" : "s"}. Select one to link, pull, or compare.`
          : "No Kordyne parts found for this search.",
      );
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Library search failed.");
    }
  }

  function disconnect() {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken("");
    setProfile(null);
    setStepFile(null);
    setStlFile(null);
    setThumbnailFile(null);
    setPropertiesFile(null);
    setLibraryItems([]);
    setLibraryLoaded(false);
    setExpandedLibraryPartIds([]);
    setLibraryCompareSelection([]);
    setLibraryCompareResult(null);
    setPullPackage(null);
    setCompareSummary(null);
    setCompareStepPackage(null);
    setCompareWorkspace(null);
    setOnshapeApiConnected(false);
    setPublishStatus("idle");
    setPublishWarning("");
    setState("not_connected");
    setStatus("Disconnected. Connect again when you are ready.");
  }

  const connected = Boolean(token && profile);
  const busy =
    state === "checking" ||
    state === "opening_browser" ||
    state === "waiting" ||
    state === "working";
  const contextName = context ? displayNameForContext(context) : "Onshape design";
  const isDark = theme === "dark";
  const surface = isDark
    ? "bg-[#002532] text-white"
    : "bg-[radial-gradient(circle_at_top_left,#ffffff_0,#f4fbfd_48%,#eaf5f8_100%)] text-slate-950";
  const card = isDark
    ? "rounded-lg border border-cyan-200/15 bg-[#06303f] shadow-[0_18px_42px_rgba(0,0,0,0.22)]"
    : "rounded-lg border border-[#cbdde4] bg-white/95 shadow-[0_16px_42px_rgba(0,48,64,0.08)]";
  const panel = isDark
    ? "rounded-lg border-cyan-200/15 bg-[#082f3d]"
    : "rounded-lg border-[#d8e7ec] bg-[#fbfdfe]";
  const muted = isDark ? "text-cyan-50/75" : "text-slate-600";
  const softMuted = isDark ? "text-cyan-50/55" : "text-slate-500";
  const rowBorder = isDark ? "border-cyan-200/10" : "border-[#dde9ee]";
  const iconTone = isDark ? "text-[#67ddf1]" : "text-[#008cad]";
  const inputClass = isDark
    ? "rounded-lg border-cyan-200/20 bg-[#002836] text-white placeholder:text-cyan-50/45 focus:border-[#00bdde] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/15"
    : "rounded-lg border-[#c9dce3] bg-white text-slate-950 placeholder:text-slate-400 focus:border-[#00bdde] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/15";
  const primaryButton =
    "rounded-lg bg-gradient-to-r from-[#00bdde] to-[#008fad] text-white shadow-[0_10px_24px_rgba(0,189,222,0.24)] hover:from-[#16c8e5] hover:to-[#009dbd] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35";
  const secondaryButton = isDark
    ? "rounded-lg border border-cyan-200/20 bg-[#0b3f4f] text-white hover:border-[#00bdde] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35"
    : "rounded-lg border border-[#c9dce3] bg-white text-[#003040] hover:border-[#00bdde] hover:bg-[#f5fbfd] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35";
  const inactiveTab = isDark
    ? "border border-cyan-200/20 bg-[#0b3f4f] text-white focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35"
    : "border border-[#c9dce3] bg-white text-[#003040] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35";
  const connectionTitle = connected ? "Connected" : "Not connected";
  const connectionDetail = connected
    ? onshapeApiConnected
      ? "Connected to Kordyne and Onshape API."
      : "Connected to Kordyne. Authorize Onshape API before publishing."
    : "Connect to access Kordyne services";
  const connectionBannerClass = connected
    ? isDark
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-50"
      : "border-emerald-300 bg-emerald-50 text-emerald-950"
    : isDark
      ? "border-red-300/30 bg-red-400/10 text-red-50"
      : "border-red-200 bg-red-50 text-red-950";
  const liveStatusClass =
    state === "error"
      ? isDark
        ? "border-red-300/25 bg-red-400/10 text-red-50"
        : "border-red-200 bg-red-50 text-red-900"
      : isDark
        ? "border-cyan-200/15 bg-cyan-200/5 text-cyan-50"
        : "border-[#d5e8ef] bg-[#f3fbfe] text-[#17394a]";
  const activePartRevision = context?.revision || resolvedPart?.revision || "";
  const activePartName =
    resolvedPart?.name ||
    (partName && !partName.startsWith("Onshape element") ? partName : "") ||
    contextName;
  const publishButtonText =
    lastPublishedFingerprint && lastPublishedFingerprint === publishFingerprint
      ? "Package saved in Kordyne"
      : publishInFlightRef.current
        ? "Publishing package..."
        : publishStatus === "published"
          ? "Package saved"
          : publishStatus === "publishing"
            ? "Publishing package..."
            : publishStatus === "saving"
              ? "Preparing package..."
              : publishStatus === "checking"
                ? "Checking Vault..."
                : "Publish package to Kordyne";
  const publishButtonClass =
    publishStatus === "published"
      ? "rounded-md bg-emerald-600 text-white"
      : primaryButton;
  const targetLabel =
    publishMode === "new_revision"
      ? `Target: next revision${selectedMatch?.revision ? ` after Rev ${selectedMatch.revision}` : ""}`
      : newFamilyMatchOverrideKey === publishMatchKey
        ? "Target: new Kordyne part family - confirmed separate part"
        : "Target: new Kordyne part family";
  const sourceLocation =
    context?.documentName ||
    context?.elementName ||
    (context?.documentId ? "Current Onshape document" : "No Onshape document");
  const activePartNumber =
    context?.partNumber || resolvedPart?.partNumber || partNumber || "";
  const revisionPlan =
    publishMode === "new_revision"
      ? selectedMatch?.revision
        ? `Next after Rev ${selectedMatch.revision}`
        : lastPart?.revision
          ? `Next after Rev ${lastPart.revision}`
          : "Existing part revision"
      : revisionScheme === "numeric"
        ? "New part family, Rev 1"
        : "New part family, Rev A";
  const publishProgressPercent =
    publishSteps.length === 0
      ? 0
      : Math.round(
          (publishSteps.filter((step) =>
            ["done", "warning"].includes(step.status),
          ).length /
            publishSteps.length) *
            100,
        );
  const duplicatePublishBlocked =
    Boolean(lastPublishedFingerprint) &&
    lastPublishedFingerprint === publishFingerprint;
  const formRowClass =
    "grid grid-cols-[28px_1fr] gap-x-3 gap-y-2 text-sm sm:grid-cols-[28px_118px_1fr] sm:items-center";
  const formLabelClass = `font-bold ${muted}`;
  const formControlClass = `col-span-2 h-11 w-full border px-3 text-sm sm:col-span-1 ${inputClass}`;

  function navButton(tab: ActiveTab, label: string, icon: ConnectorIconName) {
    return (
      <button
        type="button"
        onClick={() => {
          setActiveTab(tab);
          if (tab === "library" && connected && !busy && !libraryLoaded) {
            void searchLibrary();
          }
        }}
        className={`flex h-11 min-w-0 items-center justify-center gap-2 px-3 text-sm font-bold transition ${
          activeTab === tab
            ? "rounded-lg bg-gradient-to-r from-[#00bdde] to-[#008fad] text-white shadow-[0_10px_22px_rgba(0,189,222,0.22)] focus:outline-none focus:ring-2 focus:ring-[#00bdde]/35"
            : inactiveTab
        }`}
      >
        <ConnectorIcon name={icon} className="h-4 w-4 shrink-0" />
        {label}
      </button>
    );
  }

  function statusPill(status?: string | null) {
    const value = status?.trim();
    if (!value) return null;
    const normalized = value.toLowerCase();
    const label =
      normalized === "archived"
        ? "Archived"
        : normalized === "active"
          ? "Active"
          : normalized === "draft"
            ? "Draft"
            : value;
    const className =
      normalized === "active"
        ? isDark
          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
          : "border-emerald-300 bg-emerald-50 text-emerald-700"
        : normalized === "archived"
          ? isDark
            ? "border-slate-300/20 bg-slate-300/10 text-slate-200"
            : "border-slate-300 bg-slate-100 text-slate-600"
          : normalized === "draft"
            ? isDark
              ? "border-amber-300/30 bg-amber-400/15 text-amber-200"
              : "border-amber-300 bg-amber-50 text-amber-700"
            : isDark
              ? "border-cyan-200/20 bg-cyan-200/10 text-cyan-100"
              : "border-[#c9dce3] bg-[#f5fbfd] text-[#003040]";

    return (
      <span
        className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-6 ${surface}`}>
      <div className="mx-auto max-w-[458px] space-y-5">
        <header className="flex items-center justify-between gap-4">
          <a
            href="https://www.kordyne.com"
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1"
            aria-label="Open Kordyne website"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Static SVG brand asset is more reliable inside the Onshape iframe. */}
            <img
              src={isDark ? "/kordyne-logo-white.svg" : "/kordyne-logo.svg"}
              alt="Kordyne"
              className="h-16 w-full object-contain object-left"
            />
          </a>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`flex h-11 min-w-[128px] items-center justify-center gap-2 px-3 text-sm font-semibold ${secondaryButton}`}
          >
            <ConnectorIcon name="sun" className="h-5 w-5" />
            {isDark ? "Light theme" : "Dark theme"}
          </button>
        </header>

        <div
          className={`flex items-center gap-4 rounded-lg border px-4 py-4 ${connectionBannerClass}`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              connected
                ? "bg-emerald-600 text-white"
                : "bg-red-700 text-white"
            }`}
          >
            <ConnectorIcon
              name={connected ? "check" : "alert"}
              className="h-5 w-5"
            />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold">{connectionTitle}</p>
            <p className="mt-1 text-sm opacity-80">{connectionDetail}</p>
          </div>
        </div>

        <dl className="space-y-0 text-sm">
          {[
            {
              icon: "user" as const,
              label: "User",
              value: fieldOrDash(profile?.user?.full_name || profile?.user?.email),
            },
            {
              icon: "building" as const,
              label: "Organization",
              value: fieldOrDash(profile?.organization?.name),
            },
            {
              icon: "role" as const,
              label: "Role",
              value: fieldOrDash(profile?.membership?.role),
            },
          ].map((row) => (
            <div
              key={row.label}
              className={`grid grid-cols-[34px_1fr_1.25fr] items-center gap-3 border-b py-3 last:border-b-0 ${rowBorder}`}
            >
              <ConnectorIcon name={row.icon} className={`h-6 w-6 ${iconTone}`} />
              <dt className={`font-bold ${muted}`}>{row.label}</dt>
              <dd className="truncate text-right sm:text-left">{row.value}</dd>
            </div>
          ))}
        </dl>

        {activeTab !== "connect" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-4">
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                    isDark ? "bg-cyan-200/10" : "bg-[#edf8fb]"
                  }`}
                >
                  <ConnectorIcon name="cube" className={`h-8 w-8 ${iconTone}`} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Active design context</h2>
                  <p className="mt-2 truncate text-sm font-bold">{activePartName}</p>
                </div>
              </div>
              {onshapeApiConnected ? (
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${
                    isDark
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                      : "border-emerald-300 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <ConnectorIcon name="check" className="h-3.5 w-3.5" />
                  API connected
                </span>
              ) : null}
            </div>

            <dl className={`mt-5 border-t ${rowBorder}`}>
              {[
                ["Source", fieldOrDash(sourceLocation)],
                ["CAD part", fieldOrDash(activePartName)],
                ["Part no.", fieldOrDash(activePartNumber)],
                ["Kordyne target", fieldOrDash(selectedMatch?.name || lastPart?.name)],
                ["Revision plan", revisionPlan],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={`grid grid-cols-[132px_1fr] gap-3 border-b py-3 text-sm last:border-b-0 ${rowBorder}`}
                >
                  <dt className={muted}>{label}</dt>
                  <dd className="truncate">{value}</dd>
                </div>
              ))}
            </dl>

            {context && !publishableContext ? (
              <div className={`mt-5 border p-3 text-xs ${panel}`}>
                <p className="font-bold">Onshape did not pass document context.</p>
                <code className="mt-2 block break-all text-[11px]">
                  {ONSHAPE_EXTENSION_ACTION_URL}
                </code>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${liveStatusClass}`}>
          <ConnectorIcon
            name={state === "error" ? "alert" : "info"}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <p>{status}</p>
        </div>

        <div className={`grid grid-cols-3 overflow-hidden rounded-lg border ${rowBorder}`}>
          {navButton("connect", "Connect", "link")}
          {navButton("publish", "Publish", "upload")}
          {navButton("library", "Library", "library")}
        </div>

        {activeTab === "connect" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex gap-4">
              <span
                className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${
                  isDark ? "bg-cyan-200/10" : "bg-[#edf8fb]"
                }`}
              >
                <ConnectorIcon name="link" className={`h-10 w-10 ${iconTone}`} />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold">Connect to Kordyne</h2>
                <p className={`mt-3 text-base leading-7 ${muted}`}>
                  Browser login opens Kordyne, signs you in, and returns this
                  panel connected.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {!connected ? (
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={busy}
                  className={`flex h-12 items-center justify-center gap-2 px-5 text-base font-bold disabled:opacity-60 ${primaryButton}`}
                >
                  <ConnectorIcon name="external" className="h-5 w-5" />
                  Connect to Kordyne
                </button>
              ) : (
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={busy}
                  className={`flex h-12 items-center justify-center gap-2 px-5 text-base font-bold disabled:opacity-60 ${secondaryButton}`}
                >
                  Disconnect
                </button>
              )}
              {connected && !onshapeApiConnected ? (
                <button
                  type="button"
                  onClick={() => void connectOnshapeApi()}
                  disabled={busy}
                  className={`flex h-12 items-center justify-center gap-2 px-5 text-base font-bold disabled:opacity-60 ${primaryButton}`}
                >
                  <ConnectorIcon name="external" className="h-5 w-5" />
                  Connect Onshape API
                </button>
              ) : null}
            </div>
            <p className={`mt-6 border-t pt-5 text-sm leading-6 ${muted} ${rowBorder}`}>
              <ConnectorIcon
                name="role"
                className={`mr-2 inline h-4 w-4 align-[-3px] ${iconTone}`}
              />
              By using this connector, you agree to Kordyne Terms and Privacy.
            </p>
          </section>
        ) : null}

        {activeTab === "publish" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex items-center gap-3">
              <ConnectorIcon name="upload" className={`h-6 w-6 ${iconTone}`} />
              <h2 className="text-xl font-bold">Publish to Kordyne</h2>
            </div>
            <p className={`mt-3 text-sm font-bold ${muted}`}>{targetLabel}</p>

            <div className="mt-5 grid gap-4">
              <div className={formRowClass}>
                <ConnectorIcon name="text" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-part-name" className={formLabelClass}>
                  Part Name
                </label>
                <input
                  id="onshape-part-name"
                  value={partName}
                  onChange={(event) => setPartName(event.target.value)}
                  className={formControlClass}
                />
              </div>

              <div className={formRowClass}>
                <ConnectorIcon name="hash" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-part-number" className={formLabelClass}>
                  Part Number
                </label>
                <input
                  id="onshape-part-number"
                  value={partNumber}
                  onChange={(event) => setPartNumber(event.target.value)}
                  placeholder="Optional part number"
                  className={formControlClass}
                />
              </div>

              <div className={formRowClass}>
                <ConnectorIcon name="description" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-description" className={formLabelClass}>
                  Description
                </label>
                <input
                  id="onshape-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  className={formControlClass}
                />
              </div>

              <div className={formRowClass}>
                <ConnectorIcon name="gear" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-process" className={formLabelClass}>
                  Process Type
                </label>
                <select
                  id="onshape-process"
                  value={processType}
                  onChange={(event) => setProcessType(event.target.value)}
                  className={formControlClass}
                >
                  <option value="">Select process type</option>
                  <option>3D Printing</option>
                  <option>CNC Machining</option>
                  <option>Sheet Metal</option>
                  <option>Injection Molding</option>
                  <option>Composite Manufacturing</option>
                  <option>Casting</option>
                  <option>Fabrication</option>
                  <option>Multi Process</option>
                  <option>Other</option>
                </select>
              </div>

              <div className={formRowClass}>
                <ConnectorIcon name="layers" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-material" className={formLabelClass}>
                  Material
                </label>
                <input
                  id="onshape-material"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Type or choose a material"
                  className={formControlClass}
                />
              </div>

              <div className={formRowClass}>
                <ConnectorIcon name="part" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-publish-mode" className={formLabelClass}>
                  Publish Mode
                </label>
                <select
                  id="onshape-publish-mode"
                  value={publishMode}
                  onChange={(event) => setPublishMode(event.target.value as PublishMode)}
                  className={formControlClass}
                >
                  <option value="new_family">New family</option>
                  <option value="new_revision">New revision</option>
                </select>
              </div>

              {publishMode === "new_family" ? (
                <div className={formRowClass}>
                  <ConnectorIcon name="text" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                  <label htmlFor="onshape-revision-scheme" className={formLabelClass}>
                    Revision Scheme
                  </label>
                  <select
                    id="onshape-revision-scheme"
                    value={revisionScheme}
                    onChange={(event) =>
                      setRevisionScheme(event.target.value as "alphabetic" | "numeric")
                    }
                    className={formControlClass}
                  >
                    <option value="alphabetic">Alphabetic (A, B, C...)</option>
                    <option value="numeric">Numeric (1, 2, 3...)</option>
                  </select>
                </div>
              ) : null}

              <div className={formRowClass}>
                <ConnectorIcon name="description" className={`mt-2 h-5 w-5 sm:mt-0 ${iconTone}`} />
                <label htmlFor="onshape-revision-note" className={formLabelClass}>
                  Revision Note
                </label>
                <input
                  id="onshape-revision-note"
                  value={revisionNote}
                  onChange={(event) => setRevisionNote(event.target.value)}
                  placeholder="Optional revision note"
                  className={formControlClass}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-2 text-sm">
                  <ConnectorIcon name="info" className={`mt-2 h-5 w-5 ${iconTone}`} />
                  <label htmlFor="onshape-status" className={formLabelClass}>
                    Status
                  </label>
                  <select
                    id="onshape-status"
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value)}
                    className={`col-span-2 h-11 w-full border px-3 text-sm ${inputClass}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-2 text-sm">
                  <ConnectorIcon name="tag" className={`mt-2 h-5 w-5 ${iconTone}`} />
                  <label htmlFor="onshape-category" className={formLabelClass}>
                    Category
                  </label>
                  <select
                    id="onshape-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={`col-span-2 h-11 w-full border px-3 text-sm ${inputClass}`}
                  >
                    <option value="">Select category</option>
                    <option>Part</option>
                    <option>Assembly</option>
                    <option>Spare Part</option>
                    <option>Tooling</option>
                    <option>Jig / Fixture</option>
                    <option>Prototype</option>
                    <option>Document Only</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            </div>

            {publishMatches.length > 0 ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <div className="flex items-start gap-3">
                  <ConnectorIcon name="search" className={`h-5 w-5 shrink-0 ${iconTone}`} />
                  <div>
                    <h3 className="text-sm font-bold">Resolve Vault target first</h3>
                    <p className={`mt-1 text-xs ${muted}`}>
                      Kordyne found possible existing parts. Choose a match to publish
                      the next revision, or confirm this is a separate new part.
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {publishMatches.slice(0, 3).map((item) => {
                    const nextRevision = nextRevisionHint(item.revision);
                    return (
                      <button
                        key={item.part_id}
                        type="button"
                        onClick={() => {
                          setSelectedMatch(item);
                          setLastPart(item);
                          setPublishMode("new_revision");
                          void publish({ mode: "new_revision", match: item });
                        }}
                        disabled={publishStatus === "checking" || busy}
                        className={`block w-full border p-3 text-left text-sm disabled:opacity-60 ${secondaryButton}`}
                      >
                        <span className="block font-bold">{item.name || item.part_id}</span>
                        <span className={muted}>
                          {item.part_number ? `${item.part_number} - ` : ""}
                          {item.revision ? `Rev ${item.revision}` : "No revision"}
                        </span>
                        <span className="mt-2 block text-xs font-bold text-[#00a9c7]">
                          {nextRevision
                            ? `Publish as Rev ${nextRevision}`
                            : "Publish as next revision"}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPublishMatches([]);
                    setSelectedMatch(null);
                    setPublishMode("new_family");
                    setNewFamilyMatchOverrideKey(publishMatchKey);
                    void publish({
                      mode: "new_family",
                      allowSeparateNewPart: true,
                    });
                  }}
                  disabled={publishStatus === "checking" || busy}
                  className={`mt-3 h-10 w-full text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
                >
                  Create separate new part instead
                </button>
              </div>
            ) : null}

            {publishSteps.length > 0 ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">Publishing package</h3>
                  <span className={`text-xs font-bold ${muted}`}>
                    {publishProgressPercent}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-[#00bdde] transition-all"
                    style={{ width: `${publishProgressPercent}%` }}
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {publishSteps.map((step) => (
                    <div
                      key={step.id}
                      className="grid grid-cols-[18px_1fr] items-start gap-2 text-xs"
                    >
                      <span
                        className={`mt-0.5 h-3.5 w-3.5 rounded-full border ${
                          step.status === "done"
                            ? "border-emerald-500 bg-emerald-500"
                            : step.status === "active"
                              ? "border-[#00bdde] bg-[#00bdde]"
                              : step.status === "warning"
                                ? "border-amber-500 bg-amber-500"
                                : step.status === "error"
                                  ? "border-red-500 bg-red-500"
                                  : "border-slate-400/60"
                        }`}
                      />
                      <p>
                        <span className="font-bold">{step.label}</span>
                        {step.detail ? (
                          <span className={`ml-1 ${muted}`}>{step.detail}</span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-5 grid gap-3">
              {!onshapeApiConnected ? (
                <button
                  type="button"
                  onClick={() => void connectOnshapeApi()}
                  disabled={!connected || busy}
                  className={`h-10 w-full text-sm font-bold disabled:opacity-60 ${primaryButton}`}
                >
                  Reconnect Onshape API
                </button>
              ) : null}
              {publishWarning ? (
                <p className="text-xs font-semibold text-amber-500">
                  {publishWarning}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void publish()}
                disabled={
                  !connected ||
                  busy ||
                  publishStatus === "checking" ||
                  !publishableContext ||
                  duplicatePublishBlocked
                }
                className={`flex h-12 items-center justify-center gap-2 px-5 text-sm font-bold disabled:opacity-60 ${publishButtonClass}`}
              >
                <ConnectorIcon name={publishStatus === "published" ? "check" : "upload"} className="h-5 w-5" />
                {publishButtonText}
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "library" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex items-center gap-3">
              <ConnectorIcon name="library" className={`h-6 w-6 ${iconTone}`} />
              <h2 className="text-xl font-bold">Kordyne Vault Library</h2>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="relative min-w-0">
                <ConnectorIcon
                  name="search"
                  className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${softMuted}`}
                />
                <input
                  value={libraryQuery}
                  onChange={(event) => setLibraryQuery(event.target.value)}
                  className={`h-11 w-full min-w-0 border py-2 pl-9 pr-3 text-sm ${inputClass}`}
                  placeholder="Search parts, families, numbers..."
                />
              </label>
              <button
                type="button"
                onClick={() => void searchLibrary()}
                disabled={!connected || busy}
                className={`flex h-11 items-center justify-center gap-2 px-4 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                <ConnectorIcon name="search" className="h-4 w-4" />
                Search
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={libraryStatus}
                onChange={(event) => setLibraryStatus(event.target.value)}
                className={`h-10 border px-2 text-xs ${inputClass}`}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={librarySort}
                onChange={(event) =>
                  setLibrarySort(event.target.value as LibrarySort)
                }
                className={`h-10 border px-2 text-xs ${inputClass}`}
              >
                <option value="recent">Recent</option>
                <option value="name_asc">Name A-Z</option>
                <option value="revision_desc">Newest revision</option>
                <option value="status">Status</option>
              </select>
              <select
                value={libraryProcess}
                onChange={(event) => setLibraryProcess(event.target.value)}
                className={`h-10 border px-2 text-xs ${inputClass}`}
              >
                <option value="all">All processes</option>
                <option>3D Printing</option>
                <option>CNC Machining</option>
                <option>Sheet Metal</option>
                <option>Injection Molding</option>
                <option>Composite Manufacturing</option>
                <option>Casting</option>
                <option>Fabrication</option>
                <option>Multi Process</option>
                <option>Other</option>
              </select>
              <select
                value={libraryCategory}
                onChange={(event) => setLibraryCategory(event.target.value)}
                className={`h-10 border px-2 text-xs ${inputClass}`}
              >
                <option value="all">All categories</option>
                <option>Part</option>
                <option>Assembly</option>
                <option>Spare Part</option>
                <option>Tooling</option>
                <option>Jig / Fixture</option>
                <option>Prototype</option>
                <option>Document Only</option>
                <option>Other</option>
              </select>
              <select
                value={libraryProjectId}
                onChange={(event) => setLibraryProjectId(event.target.value)}
                className={`col-span-2 h-10 border px-2 text-xs ${inputClass}`}
              >
                <option value="all">All explicit projects/workspaces</option>
                <option value="none">Standalone vault parts only</option>
                {libraryProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_type === "single_part_workspace"
                      ? "Part Workspace"
                      : "Project"}{" "}
                    - {project.name}
                  </option>
                ))}
              </select>
            </div>
            {libraryLoaded ? (
              <div className={`mt-3 border p-3 text-xs ${panel}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <ConnectorIcon name="compare" className={`h-5 w-5 shrink-0 ${iconTone}`} />
                    <div className="min-w-0">
                    <p className="font-bold">Library compare</p>
                    <p className={`mt-1 leading-5 ${muted}`}>
                      Select any two parts or revisions to import them into this
                      Onshape document as comparison tabs.
                    </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-bold">
                    {libraryCompareSelection.length}/2
                  </span>
                </div>
                {libraryCompareSelection.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {libraryCompareSelection.map((part) => (
                      <button
                        key={part.part_id}
                        type="button"
                        onClick={() => toggleLibraryCompareSelection(part)}
                        className={`max-w-full truncate px-2 py-1 font-semibold ${secondaryButton}`}
                      >
                        {partDisplayName(part)} - {revisionDisplay(part)} x
                      </button>
                    ))}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void compareLibrarySelection()}
                  disabled={!connected || busy || libraryCompareSelection.length !== 2}
                  className={`mt-3 flex h-10 w-full items-center justify-center gap-2 px-4 text-xs font-bold disabled:opacity-60 ${primaryButton}`}
                >
                  <ConnectorIcon name="compare" className="h-4 w-4" />
                  Compare selected parts
                </button>
                {libraryCompareResult ? (
                  <dl className="mt-3 grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 border-t pt-3">
                    <dt className={muted}>Left</dt>
                    <dd className="truncate">
                      {partDisplayName(libraryCompareResult.left.part)} -{" "}
                      {revisionDisplay(libraryCompareResult.left.part)}
                    </dd>
                    <dt className={muted}>Right</dt>
                    <dd className="truncate">
                      {partDisplayName(libraryCompareResult.right.part)} -{" "}
                      {revisionDisplay(libraryCompareResult.right.part)}
                    </dd>
                    <dt className={muted}>File delta</dt>
                    <dd>
                      {libraryCompareResult.fileSizeDeltaBytes === null
                        ? "-"
                        : libraryCompareResult.fileSizeDeltaBytes === 0
                          ? "0 B"
                          : formatBytes(libraryCompareResult.fileSizeDeltaBytes)}
                    </dd>
                  </dl>
                ) : null}
              </div>
            ) : null}
            {libraryItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {libraryItems.map((item) => {
                  const imageUrl =
                    item.thumbnail_signed_url ||
                    item.thumbnail_url ||
                    item.preview_url ||
                    item.image_url ||
                    "";
                  const revisions = item.revisions ?? [];
                  const hasRevisionList = revisions.length > 1;
                  const expanded = expandedLibraryPartIds.includes(item.part_id);
                  const selectedForCompare = libraryCompareSelection.some(
                    (part) => part.part_id === item.part_id,
                  );

                  return (
                    <div key={item.part_id} className={`border p-3 text-sm ${panel}`}>
                      <div className="flex gap-3">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Signed Vault thumbnail URLs are short-lived.
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-16 w-16 rounded-lg border border-slate-300 object-cover"
                          />
                        ) : (
                          <span
                            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border ${
                              isDark
                                ? "border-cyan-200/15 bg-cyan-200/5"
                                : "border-[#d8e7ec] bg-[#f4fafc]"
                            }`}
                          >
                            <ConnectorIcon name="cube" className={`h-8 w-8 ${iconTone}`} />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">
                            {item.name || item.part_id}
                          </p>
                          <p className={`mt-1 truncate text-xs ${muted}`}>
                            {item.part_number ? `${item.part_number} - ` : ""}
                            {item.revision ? `Rev ${item.revision}` : "No revision"}
                            {item.revision_count
                              ? ` - ${item.revision_count} revision${item.revision_count === 1 ? "" : "s"}`
                              : ""}
                          </p>
                          <div className={`mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs ${muted}`}>
                            {[item.process_type, item.category]
                              .filter(Boolean)
                              .map((value) => (
                                <span key={value} className="truncate">
                                  {value}
                                </span>
                              ))}
                            {item.process_type || item.category ? (
                              <span className={softMuted}>-</span>
                            ) : null}
                            {statusPill(item.status)}
                            {!item.process_type && !item.category && !item.status ? (
                              <span>No classification</span>
                            ) : null}
                          </div>
                          {item.linked_projects?.length ? (
                            <p className={`mt-1 truncate text-xs ${muted}`}>
                              {item.linked_projects
                                .map((project) => project.name)
                                .join(" - ")}
                            </p>
                          ) : null}
                        </div>
                        {hasRevisionList ? (
                          <button
                            type="button"
                            onClick={() => toggleLibraryRevisionList(item.part_id)}
                            className={`flex h-8 w-8 shrink-0 items-center justify-center text-base font-bold ${secondaryButton}`}
                            aria-label={
                              expanded ? "Collapse revisions" : "Expand revisions"
                            }
                          >
                            {expanded ? "-" : "+"}
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            linkLibraryPart(item, "library");
                            void pull(item);
                          }}
                          disabled={busy}
                          className={`flex h-9 items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-60 ${secondaryButton}`}
                        >
                          <ConnectorIcon name="pull" className="h-4 w-4" />
                          Pull
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            linkLibraryPart(item, "library");
                            void compare(item);
                          }}
                          disabled={busy}
                          className={`flex h-9 items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-60 ${secondaryButton}`}
                        >
                          <ConnectorIcon name="compare" className="h-4 w-4" />
                          Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLibraryCompareSelection(item)}
                          className={`flex h-9 items-center justify-center gap-1.5 text-xs font-bold ${selectedForCompare ? primaryButton : secondaryButton}`}
                        >
                          <ConnectorIcon name="select" className="h-4 w-4" />
                          {selectedForCompare ? "Selected" : "Select"}
                        </button>
                      </div>
                      {expanded ? (
                        <div className="mt-3 border-t pt-3">
                          <p className={`text-xs font-bold ${muted}`}>
                            Available revisions
                          </p>
                          <div className="mt-2 space-y-2">
                            {revisions.map((revision) => {
                              const revisionSelected = libraryCompareSelection.some(
                                (part) => part.part_id === revision.part_id,
                              );

                              return (
                                <div
                                  key={revision.part_id}
                                  className="grid gap-2 border-t pt-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-bold">
                                      {revisionDisplay(revision)}
                                    </p>
                                    <p className={`mt-1 truncate ${muted}`}>
                                      {[revision.status, revision.updated_at]
                                        .filter(Boolean)
                                        .join(" - ") || "No status"}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        linkLibraryPart(revision, "library");
                                        void pull(revision);
                                      }}
                                      disabled={busy}
                                      className={`flex h-8 items-center justify-center gap-1 px-2 font-bold disabled:opacity-60 ${secondaryButton}`}
                                    >
                                      <ConnectorIcon name="pull" className="h-3.5 w-3.5" />
                                      Pull
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        linkLibraryPart(revision, "library");
                                        void compare(revision);
                                      }}
                                      disabled={busy}
                                      className={`flex h-8 items-center justify-center gap-1 px-2 font-bold disabled:opacity-60 ${secondaryButton}`}
                                    >
                                      <ConnectorIcon name="compare" className="h-3.5 w-3.5" />
                                      Compare
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleLibraryCompareSelection(revision)
                                      }
                                      className={`flex h-8 items-center justify-center gap-1 px-2 font-bold ${revisionSelected ? primaryButton : secondaryButton}`}
                                    >
                                      <ConnectorIcon name="select" className="h-3.5 w-3.5" />
                                      {revisionSelected ? "A/B" : "Select"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : libraryLoaded ? (
              <div className={`mt-4 border p-4 text-sm ${panel}`}>
                No Kordyne parts match the current library filters.
              </div>
            ) : null}

            {pullPackage ? (
              <div className={`mt-4 border p-4 text-sm ${panel}`}>
                <h3 className="font-bold">Pull package</h3>
                <p className={`mt-2 text-xs leading-5 ${muted}`}>
                  {pullPackage.availability.native_count} native reference
                  {pullPackage.availability.native_count === 1 ? "" : "s"} and{" "}
                  {pullPackage.availability.step_count} STEP exchange file
                  {pullPackage.availability.step_count === 1 ? "" : "s"} for
                  Rev {fieldOrDash(pullPackage.part.revision)}.
                </p>
                {pullPackage.source_link?.open_url ? (
                  <a
                    href={pullPackage.source_link.open_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-3 block border p-3 text-xs font-semibold ${secondaryButton}`}
                  >
                    Open native Onshape source
                  </a>
                ) : null}
              </div>
            ) : null}

            {compareSummary ? (
              <div className={`mt-4 border p-4 text-sm ${panel}`}>
                <h3 className="font-bold">Compare status</h3>
                <dl className="mt-3 grid grid-cols-[92px_1fr] gap-x-3 gap-y-2 text-xs">
                  <dt className={muted}>Current</dt>
                  <dd>{fieldOrDash(compareSummary.current.revision)}</dd>
                  <dt className={muted}>Latest</dt>
                  <dd>{fieldOrDash(compareSummary.latest.revision)}</dd>
                  <dt className={muted}>State</dt>
                  <dd
                    className={
                      compareSummary.status.is_latest_revision
                        ? "font-bold text-emerald-500"
                        : "font-bold text-amber-500"
                    }
                  >
                    {compareSummary.status.is_latest_revision
                      ? "Current source is latest"
                      : "Newer Kordyne revision available"}
                  </dd>
                </dl>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "pull" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex items-center gap-3">
              <ConnectorIcon name="pull" className={`h-6 w-6 ${iconTone}`} />
              <h2 className="text-xl font-bold">Pull from Kordyne</h2>
            </div>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>
              Pull opens the native Onshape source when Kordyne has one, or
              imports the STEP exchange file into this Onshape document.
            </p>
            <dl className="mt-5 grid grid-cols-[96px_1fr] gap-x-3 gap-y-3 text-sm">
              <dt className={muted}>Linked part</dt>
              <dd className="truncate">{fieldOrDash(lastPart?.name)}</dd>
              <dt className={muted}>Revision</dt>
              <dd>{fieldOrDash(lastPart?.revision)}</dd>
            </dl>
            <button
              type="button"
              onClick={() => void pull()}
              disabled={!connected || busy || !lastPart}
              className={`mt-5 flex h-12 w-full items-center justify-center gap-2 px-5 text-sm font-bold disabled:opacity-60 ${primaryButton}`}
            >
              <ConnectorIcon name="pull" className="h-5 w-5" />
              Pull Latest
            </button>
            {pullPackage ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <h3 className="text-sm font-bold">Pull package ready</h3>
                <p className={`mt-2 text-xs leading-5 ${muted}`}>
                  {pullPackage.availability.native_count} native reference
                  {pullPackage.availability.native_count === 1 ? "" : "s"} and{" "}
                  {pullPackage.availability.step_count} STEP exchange file
                  {pullPackage.availability.step_count === 1 ? "" : "s"} are
                  available for Rev {fieldOrDash(pullPackage.part.revision)}.
                </p>

                {pullPackage.source_link?.open_url ? (
                  <a
                    href={pullPackage.source_link.open_url}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-4 block border p-3 text-xs font-semibold ${secondaryButton}`}
                  >
                    Open native Onshape source
                  </a>
                ) : null}

                {pullPackage.native_files.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold">Native Onshape reference</p>
                    <div className="mt-2 space-y-2">
                      {pullPackage.native_files.map((file) => (
                        <a
                          key={file.file_id || file.filename}
                          href={file.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`block border p-3 text-xs font-semibold ${secondaryButton}`}
                        >
                          <span className="block truncate">{file.filename}</span>
                          <span className={`mt-1 block font-normal ${muted}`}>
                            {file.native_format?.feature_tree_strategy ||
                              "Feature tree remains in Onshape."}
                            {formatBytes(file.size_bytes)
                              ? ` - ${formatBytes(file.size_bytes)}`
                              : ""}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {pullPackage.step_files.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-bold">STEP exchange files</p>
                    <div className="mt-2 space-y-2">
                      {pullPackage.step_files.map((file) => (
                        <a
                          key={file.file_id || file.filename}
                          href={file.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`block border p-3 text-xs font-semibold ${secondaryButton}`}
                        >
                          <span className="block truncate">{file.filename}</span>
                          <span className={`mt-1 block font-normal ${muted}`}>
                            Vendor exchange geometry
                            {formatBytes(file.size_bytes)
                              ? ` - ${formatBytes(file.size_bytes)}`
                              : ""}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "compare" ? (
          <section className={`p-5 ${card}`}>
            <div className="flex items-center gap-3">
              <ConnectorIcon name="compare" className={`h-6 w-6 ${iconTone}`} />
              <h2 className="text-xl font-bold">Compare with Kordyne</h2>
            </div>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>
              Check whether this Onshape source is linked to the latest Kordyne
              revision and import the latest STEP into this document for
              geometry review.
            </p>
            <dl className="mt-5 grid grid-cols-[112px_1fr] gap-x-3 gap-y-3 text-sm">
              <dt className={muted}>Linked part</dt>
              <dd>{fieldOrDash(lastPart?.name)}</dd>
              <dt className={muted}>Revision</dt>
              <dd>{fieldOrDash(lastPart?.revision)}</dd>
              {compareSummary ? (
                <>
                  <dt className={muted}>Latest</dt>
                  <dd>{fieldOrDash(compareSummary.latest.revision)}</dd>
                  <dt className={muted}>Status</dt>
                  <dd
                    className={
                      compareSummary.status.is_latest_revision
                        ? "font-bold text-emerald-500"
                        : "font-bold text-amber-500"
                    }
                  >
                    {compareSummary.status.is_latest_revision
                      ? "Current local source is latest"
                      : "Newer Kordyne revision available"}
                  </dd>
                </>
              ) : null}
            </dl>
            <button
              type="button"
              onClick={() => void compare()}
              disabled={!connected || busy || !lastPart}
              className={`mt-5 flex h-12 w-full items-center justify-center gap-2 px-5 text-sm font-bold disabled:opacity-60 ${primaryButton}`}
            >
              <ConnectorIcon name="compare" className="h-5 w-5" />
              Open Compare
            </button>
            {compareStepPackage?.step_file?.signed_url ? (
              <a
                href={compareStepPackage.step_file.signed_url}
                target="_blank"
                rel="noreferrer"
                className={`mt-3 block h-11 px-5 py-3 text-center text-sm font-bold ${secondaryButton}`}
              >
                Download latest STEP fallback
              </a>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("pull");
                  void pull();
                }}
                disabled={!connected || busy || !lastPart}
                className={`flex h-10 items-center justify-center gap-2 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                <ConnectorIcon name="pull" className="h-4 w-4" />
                Pull Latest
              </button>
              <button
                type="button"
                onClick={() => {
                  if (lastPart) {
                    setSelectedMatch(lastPart);
                    setPublishMode("new_revision");
                  }
                  setActiveTab("publish");
                }}
                disabled={!connected || busy || !lastPart}
                className={`flex h-10 items-center justify-center gap-2 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                <ConnectorIcon name="upload" className="h-4 w-4" />
                Publish Rev
              </button>
            </div>
            {compareWorkspace ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold">Comparison workspace</h3>
                    <p className={`mt-1 text-xs ${muted}`}>
                      Current source and Kordyne geometry are staged together for
                      visual review.
                    </p>
                  </div>
                  {compareWorkspace.assembly?.inserted_count ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">
                      Assembly
                    </span>
                  ) : (
                    <span className={`rounded-md border px-2 py-1 text-xs font-bold ${muted}`}>
                      Tabs
                    </span>
                  )}
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[360px] border-collapse text-left text-xs">
                    <thead className={muted}>
                      <tr className="border-b">
                        <th className="py-2 pr-3 font-bold">Source</th>
                        <th className="py-2 pr-3 font-bold">Part</th>
                        <th className="py-2 pr-3 font-bold">Rev</th>
                        <th className="py-2 pr-3 font-bold">Material</th>
                        <th className="py-2 font-bold">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compareWorkspace.rows.map((row) => (
                        <tr key={`${row.label}-${row.onshape_element_id}`} className="border-b last:border-b-0">
                          <td className="py-2 pr-3 font-bold">{row.label}</td>
                          <td className="max-w-[120px] truncate py-2 pr-3">
                            {fieldOrDash(row.name)}
                          </td>
                          <td className="py-2 pr-3">{fieldOrDash(row.revision)}</td>
                          <td className="max-w-[96px] truncate py-2 pr-3">
                            {fieldOrDash(row.material)}
                          </td>
                          <td className="py-2">{formatVolume(row.volume_m3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {compareWorkspace.rows.length === 2 ? (
                  <p className={`mt-3 text-xs ${muted}`}>
                    Volume delta:{" "}
                    <span className="font-bold">
                      {formatDeltaPercent(
                        compareWorkspace.rows[0]?.volume_m3,
                        compareWorkspace.rows[1]?.volume_m3,
                      )}
                    </span>
                  </p>
                ) : null}
                {compareWorkspace.assembly?.warnings?.length ? (
                  <p className="mt-3 text-xs font-semibold text-amber-500">
                    {compareWorkspace.assembly.warnings[0]}
                  </p>
                ) : null}
              </div>
            ) : null}
            {compareSummary ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <h3 className="text-sm font-bold">Revision history</h3>
                <div className="mt-3 space-y-2">
                  {compareSummary.revisions.slice(0, 6).map((revision) => (
                    <div
                      key={revision.part_id}
                      className={`border px-3 py-2 text-xs ${secondaryButton}`}
                    >
                      <span className="font-bold">
                        Rev {fieldOrDash(revision.revision)}
                      </span>
                      <span className={`ml-2 ${muted}`}>
                        {fieldOrDash(revision.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
