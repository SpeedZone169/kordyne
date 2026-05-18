"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  revisions?: PublishedPart[];
};

type UploadedDesignFile = {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  role: "step" | "native" | "thumbnail";
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
type PublishStatus = "idle" | "saving" | "publishing" | "published";
type LibrarySort = "recent" | "name_asc" | "revision_desc" | "status";

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

const TOKEN_STORAGE_KEY = "kordyne:onshape:connection-token";
const THEME_STORAGE_KEY = "kordyne:onshape:theme";
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

function openBlankUserTab() {
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

function openUrlInTab(url: string, tab: Window | null) {
  if (!url) return false;

  try {
    if (tab && !tab.closed) {
      tab.location.href = url;
      return true;
    }
  } catch {
    // Fall through to opening a fresh tab below.
  }

  try {
    return Boolean(window.open(url, "_blank", "noopener,noreferrer"));
  } catch {
    return false;
  }
}

function closePendingTab(tab: Window | null) {
  try {
    if (tab && !tab.closed) tab.close();
  } catch {
    // Some browsers block scripted close; leaving a blank tab is better than failing the workflow.
  }
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

export default function OnshapeDesignAppPage() {
  const [context, setContext] = useState<OnshapeContext | null>(null);
  const [token, setToken] = useState("");
  const [state, setState] = useState<ConnectionState>("checking");
  const [status, setStatus] = useState("Reading Onshape context...");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lastPart, setLastPart] = useState<PublishedPart | null>(null);
  const [stepFile, setStepFile] = useState<UploadedDesignFile | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<UploadedDesignFile | null>(
    null,
  );
  const [onshapeApiConnected, setOnshapeApiConnected] = useState(false);
  const [libraryItems, setLibraryItems] = useState<PublishedPart[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState("all");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [libraryProcess, setLibraryProcess] = useState("all");
  const [librarySort, setLibrarySort] = useState<LibrarySort>("recent");
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
  const [publishMatches, setPublishMatches] = useState<PublishedPart[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<PublishedPart | null>(null);
  const [pullPackage, setPullPackage] = useState<PullPackage | null>(null);
  const [compareSummary, setCompareSummary] =
    useState<CompareStatusPayload | null>(null);
  const [compareStepPackage, setCompareStepPackage] =
    useState<CompareStepPackage | null>(null);

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
  }, [lastPart?.part_id]);

  useEffect(() => {
    setPublishStatus("idle");
    setPublishWarning("");
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

  async function publish() {
    if (!context || !token) return;

    setState("working");
    setPublishStatus("saving");
    setPublishWarning("");
    setStatus("Saving package: checking Onshape and Kordyne data...");

    try {
      if (!partName.trim()) {
        setPublishStatus("idle");
        setState("error");
        setStatus("Part Name is required before publishing.");
        return;
      }

      let targetMatch =
        publishMode === "new_revision"
          ? selectedMatch || lastPart || null
          : null;

      if (!targetMatch && publishMode === "new_family") {
        setStatus("Saving package: checking for existing Kordyne part...");
        const matches = await findPotentialPublishMatches();
        if (matches.length > 0) {
          setPublishStatus("idle");
          setState("connected");
          setStatus(
            "Possible existing Kordyne part found. Choose new revision or keep creating a separate part.",
          );
          setActiveTab("publish");
          return;
        }
      }

      if (publishMode === "new_revision" && !targetMatch) {
        setStatus("Saving package: finding the Kordyne part to revise...");
        const matches = await findPotentialPublishMatches();
        targetMatch = matches[0] ?? null;
      }

      if (publishMode === "new_revision" && !targetMatch?.part_id) {
        setPublishStatus("idle");
        setState("error");
        setStatus("Select an existing Kordyne part before publishing a revision.");
        return;
      }

      let publishStepFile = stepFile;
      if (!publishStepFile) {
        setStatus("Saving package: exporting STEP from Onshape...");
        publishStepFile = await exportStepFromOnshape(true);
      }

      if (!publishStepFile) {
        setPublishStatus("idle");
        setState("connected");
        setStatus(
          onshapeApiConnected
            ? "STEP export was not attached. Check Onshape API access and try again."
            : "Reconnect Onshape API access so Kordyne can export STEP automatically.",
        );
        return;
      }

      let publishThumbnailFile = thumbnailFile;
      if (!publishThumbnailFile) {
        setStatus("Saving package: capturing Onshape preview...");
        publishThumbnailFile = await exportThumbnailFromOnshape(true);
      }

      if (!publishThumbnailFile) {
        setPublishWarning(
          onshapeApiConnected
            ? "Onshape did not return a preview image. Kordyne will publish the CAD package now and the thumbnail can be refreshed later."
            : "Onshape API access needs reconnecting before Kordyne can refresh the preview thumbnail.",
        );
      }

      setState("working");
      setPublishStatus("publishing");
      setStatus(
        publishMode === "new_revision"
          ? "Publishing package: creating next Kordyne revision..."
          : "Publishing package: creating Kordyne part...",
      );

      const publishFiles = publishThumbnailFile
        ? [publishStepFile, publishThumbnailFile]
        : [publishStepFile];

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
          part_id: publishMode === "new_revision" ? targetMatch?.part_id : null,
          external_workspace_id: context.workspaceId || null,
          external_project_id: context.companyId || null,
          external_document_id: context.documentId || null,
          external_item_id:
            context.partId || context.elementId || context.tabElementId || null,
          external_version_id:
            context.microversionId || context.versionId || null,
          external_revision_id: context.revision || null,
          external_name: partName || displayNameForContext(context),
          external_url: context.externalUrl || null,
          metadata: {
            publish_mode: publishMode,
            name: partName.trim(),
            part_number: partNumber.trim() || null,
            description: description.trim() || null,
            process_type: processType || null,
            material: material.trim() || null,
            revision_scheme: publishMode === "new_family" ? revisionScheme : null,
            category: category || null,
            status: statusValue,
            revision_note: revisionNote.trim() || "Published from Onshape.",
            cad_metadata: {
              ...context,
              resolved_part: resolvedPart,
              native_source: "onshape_document_reference",
              step_storage_path: publishStepFile.storage_path,
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
      setStatus(
        payload.revision
          ? `Part published to Kordyne as revision ${payload.revision}.`
          : "Part published to Kordyne.",
      );
    } catch (error) {
      setPublishStatus("idle");
      setState("error");
      setStatus(error instanceof Error ? error.message : "Publish failed.");
    }
  }

  function linkLibraryPart(item: PublishedPart, tab: ActiveTab = "publish") {
    setLastPart(item);
    setSelectedMatch(item);
    setPublishMode("new_revision");
    setActiveTab(tab);
    setStatus("Linked this Onshape context to a Kordyne part.");
  }

  async function compare(sourcePart = lastPart) {
    if (!sourcePart?.part_id) {
      setStatus("Publish or link this Onshape context before compare.");
      return;
    }

    const editableWorkspaceId =
      onshapeWorkspaceId ||
      (onshapeWorkspaceOrVersion === "w" ? onshapeWorkspaceOrVersionId : "");
    const pendingCompareTab =
      onshapeDocumentId && editableWorkspaceId ? openBlankUserTab() : null;

    setState("working");
    setStatus("Checking Kordyne revision status...");
    setCompareSummary(null);
    setCompareStepPackage(null);

    try {
      setLastPart(sourcePart);

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

      if (stepPackage?.step_file?.file_id && onshapeDocumentId && editableWorkspaceId) {
        setStatus("Importing latest Kordyne STEP into the active Onshape document...");

        const imported = await callOnshapeApi<ImportStepPayload>(
          "/api/design-app/onshape/import-step",
          {
            method: "POST",
            body: JSON.stringify({
              mode: "current_document",
              part_id: stepPackage.latest.part_id,
              file_id: stepPackage.step_file.file_id,
              documentId: onshapeDocumentId,
              workspaceId: editableWorkspaceId,
              workspaceOrVersion: onshapeWorkspaceOrVersion,
              workspaceOrVersionId: onshapeWorkspaceOrVersionId,
            }),
          },
        );

        if (imported.onshape.open_url) {
          const opened = openUrlInTab(imported.onshape.open_url, pendingCompareTab);
          compareOpenMessage = opened
            ? " Latest STEP was imported into this Onshape document and opened for visual review."
            : " Latest STEP was imported into this Onshape document; open the imported tab from Onshape if the browser blocked the new tab.";
        } else {
          closePendingTab(pendingCompareTab);
          compareOpenMessage =
            " Latest STEP was imported into this Onshape document, but Onshape did not return a direct tab URL.";
        }
      } else {
        closePendingTab(pendingCompareTab);
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
      closePendingTab(pendingCompareTab);
      setState("error");
      setStatus(error instanceof Error ? error.message : "Compare failed.");
    }
  }

  async function pull(sourcePart = lastPart) {
    if (!sourcePart?.part_id) {
      setStatus("Publish or link a Kordyne part before pull.");
      return;
    }

    const pendingPullTab = openBlankUserTab();

    setState("working");
    setStatus("Preparing Kordyne pull package...");
    setPullPackage(null);

    try {
      setLastPart(sourcePart);

      const payload = await callOnshapeApi<PullPackage>(
        "/api/design-app/onshape/pull-package",
        {
          method: "POST",
          body: JSON.stringify({ part_id: sourcePart.part_id }),
        },
      );

      setPullPackage(payload);

      if (payload.open_action?.url) {
        const opened = openUrlInTab(payload.open_action.url, pendingPullTab);
        setState("connected");
        setStatus(
          opened
            ? `Opened native Onshape source for Rev ${fieldOrDash(payload.part.revision)}. Edit there, then publish back to Kordyne as a new revision when ready.`
            : `Native Onshape source is available for Rev ${fieldOrDash(payload.part.revision)}, but the browser blocked opening it. Use the source link in the pull package below.`,
        );
        return;
      }

      const primaryStep = payload.step_files[0];

      if (primaryStep?.file_id) {
        setStatus("Native Onshape source is not available. Importing STEP into a new Onshape document...");

        const imported = await callOnshapeApi<ImportStepPayload>(
          "/api/design-app/onshape/import-step",
          {
            method: "POST",
            body: JSON.stringify({
              mode: "new_document",
              part_id: sourcePart.part_id,
              file_id: primaryStep.file_id,
            }),
          },
        );

        if (imported.onshape.open_url) {
          const opened = openUrlInTab(imported.onshape.open_url, pendingPullTab);
          setState("connected");
          setStatus(
            opened
              ? `Imported STEP for Rev ${fieldOrDash(payload.part.revision)} into a new Onshape document. Publish back to Kordyne as a new revision after edits.`
              : `Imported STEP for Rev ${fieldOrDash(payload.part.revision)} into a new Onshape document, but the browser blocked opening it.`,
          );
          return;
        }
      }

      closePendingTab(pendingPullTab);
      setState("connected");
      setStatus(
        `Pull package ready: ${payload.availability.native_count} native reference${payload.availability.native_count === 1 ? "" : "s"}, ${payload.availability.step_count} STEP exchange file${payload.availability.step_count === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      closePendingTab(pendingPullTab);
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
      }>("/api/design-app/onshape/library-search", {
        method: "POST",
        body: JSON.stringify({
          q: libraryQuery,
          limit: 100,
          status: libraryStatus,
          category: libraryCategory,
          process_type: libraryProcess,
          sort: librarySort,
        }),
      });

      setLibraryItems(payload.items);
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
    setThumbnailFile(null);
    setLibraryItems([]);
    setLibraryLoaded(false);
    setPullPackage(null);
    setCompareSummary(null);
    setCompareStepPackage(null);
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
  const surface = isDark ? "bg-[#1f2937] text-white" : "bg-[#f4f7fb] text-slate-950";
  const card = isDark
    ? "border border-slate-500/70 bg-[#1f2937]"
    : "border border-slate-300 bg-white";
  const panel = isDark ? "border-slate-600 bg-[#263241]" : "border-slate-200 bg-slate-50";
  const muted = isDark ? "text-slate-300" : "text-slate-600";
  const inputClass = isDark
    ? "border-slate-600 bg-[#111827] text-white placeholder:text-slate-400"
    : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400";
  const secondaryButton = isDark
    ? "border border-slate-600 bg-[#344255] text-white hover:border-slate-400"
    : "border border-slate-300 bg-white text-slate-900 hover:border-blue-600";
  const inactiveTab = isDark
    ? "border border-slate-600 bg-[#344255] text-white"
    : "border border-slate-300 bg-white text-slate-900";
  const activePartId = context?.partId || resolvedPart?.partId || "";
  const activePartRevision = context?.revision || resolvedPart?.revision || "";
  const activePartName =
    resolvedPart?.name ||
    (partName && !partName.startsWith("Onshape element") ? partName : "") ||
    contextName;
  const publishButtonText =
    publishStatus === "published"
      ? "Part published"
      : publishStatus === "publishing"
        ? "Publishing..."
        : publishStatus === "saving"
          ? "Saving package..."
          : "Publish to Kordyne";
  const publishButtonClass =
    publishStatus === "published"
      ? "bg-emerald-600 text-white"
      : "bg-blue-600 text-white";
  const targetLabel =
    publishMode === "new_revision"
      ? `Target: next revision${selectedMatch?.revision ? ` after Rev ${selectedMatch.revision}` : ""}`
      : publishMatches.length > 0
        ? "Target: new Kordyne part family - duplicate intentionally allowed"
        : "Target: new Kordyne part family";

  function navButton(tab: ActiveTab, label: string) {
    return (
      <button
        type="button"
        onClick={() => {
          setActiveTab(tab);
          if (tab === "library" && connected && !busy && !libraryLoaded) {
            void searchLibrary();
          }
        }}
        className={`h-9 min-w-[94px] px-4 text-sm font-semibold ${
          activeTab === tab ? "bg-blue-600 text-white" : inactiveTab
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-5 ${surface}`}>
      <div className="mx-auto max-w-[420px] space-y-5">
        <header className="flex items-center justify-between gap-4">
          <Image
            src="/kordyne-logo.svg"
            alt="Kordyne"
            width={260}
            height={72}
            className="h-14 min-w-0 flex-1 object-contain object-left"
          />
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`h-11 min-w-[112px] px-3 text-sm font-semibold ${secondaryButton}`}
          >
            {isDark ? "Light theme" : "Dark theme"}
          </button>
        </header>

        <div
          className={`py-2 text-center text-sm font-bold ${
            connected ? "bg-emerald-200 text-emerald-950" : "bg-[#8f2f12] text-white"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </div>

        <section className={`p-5 ${card}`}>
          <h1 className="text-lg font-bold">Onshape design-to-vault workspace</h1>
          <p className={`mt-2 text-sm leading-6 ${muted}`}>
            Connect once, publish cleanly, and move from Onshape design context
            to Kordyne with fewer clicks.
          </p>
        </section>

        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-3 text-sm">
          <dt className={`font-bold ${muted}`}>User</dt>
          <dd>{fieldOrDash(profile?.user?.full_name || profile?.user?.email)}</dd>
          <dt className={`font-bold ${muted}`}>Organization</dt>
          <dd>{fieldOrDash(profile?.organization?.name)}</dd>
          <dt className={`font-bold ${muted}`}>Role</dt>
          <dd>{fieldOrDash(profile?.membership?.role)}</dd>
        </dl>

        <section className={`p-5 ${card}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">Active Onshape context</h2>
              <p className="mt-3 text-sm font-bold">{activePartName}</p>
            </div>
            {onshapeApiConnected ? (
              <span className="text-xs font-bold text-emerald-500">API connected</span>
            ) : null}
          </div>

          <dl className="mt-5 grid grid-cols-[92px_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className={muted}>Document</dt>
            <dd className="truncate">{fieldOrDash(context?.documentId)}</dd>
            <dt className={muted}>Element</dt>
            <dd className="truncate">{fieldOrDash(context?.elementId)}</dd>
            <dt className={muted}>Part</dt>
            <dd className="truncate">{fieldOrDash(activePartId)}</dd>
            <dt className={muted}>Part no.</dt>
            <dd className="truncate">{fieldOrDash(context?.partNumber || resolvedPart?.partNumber || partNumber)}</dd>
            <dt className={muted}>Revision</dt>
            <dd>{fieldOrDash(activePartRevision)}</dd>
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

        <p className={`text-sm ${state === "error" ? "font-semibold text-red-500" : muted}`}>
          {status}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {navButton("connect", "Connect")}
          {navButton("publish", "Publish")}
          {navButton("library", "Library")}
          {navButton("pull", "Pull")}
          {navButton("compare", "Compare")}
        </div>

        {activeTab === "connect" ? (
          <section className={`p-5 ${card}`}>
            <h2 className="text-xl font-bold">Connect to Kordyne</h2>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>
              Browser login opens Kordyne, signs you in, and returns this panel
              connected.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {!connected ? (
                <button
                  type="button"
                  onClick={() => void connect()}
                  disabled={busy}
                  className="h-11 bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
                >
                  Connect to Kordyne
                </button>
              ) : (
                <button
                  type="button"
                  onClick={disconnect}
                  disabled={busy}
                  className={`h-11 px-5 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
                >
                  Disconnect
                </button>
              )}
              {connected && !onshapeApiConnected ? (
                <button
                  type="button"
                  onClick={() => void connectOnshapeApi()}
                  disabled={busy}
                  className="h-11 bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
                >
                  Connect Onshape API
                </button>
              ) : null}
            </div>
            <p className={`mt-5 text-xs ${muted}`}>
              By using this connector, you agree to Kordyne Terms and Privacy.
            </p>
          </section>
        ) : null}

        {activeTab === "publish" ? (
          <section className={`p-5 ${card}`}>
            <h2 className="text-xl font-bold">Publish to Kordyne</h2>
            <p className={`mt-3 text-sm font-bold ${muted}`}>{targetLabel}</p>

            <div className="mt-5 grid gap-4">
              <label className="text-sm font-bold">
                Part Name
                <input
                  value={partName}
                  onChange={(event) => setPartName(event.target.value)}
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                />
              </label>

              <label className="text-sm font-bold">
                Part Number
                <input
                  value={partNumber}
                  onChange={(event) => setPartNumber(event.target.value)}
                  placeholder="Optional part number"
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                />
              </label>

              <label className="text-sm font-bold">
                Description
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                />
              </label>

              <label className="text-sm font-bold">
                Process Type
                <select
                  value={processType}
                  onChange={(event) => setProcessType(event.target.value)}
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
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
              </label>

              <label className="text-sm font-bold">
                Material
                <input
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="Type or choose a material"
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                />
              </label>

              <label className="text-sm font-bold">
                Publish Mode
                <select
                  value={publishMode}
                  onChange={(event) => setPublishMode(event.target.value as PublishMode)}
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                >
                  <option value="new_family">New family</option>
                  <option value="new_revision">New revision</option>
                </select>
              </label>

              {publishMode === "new_family" ? (
                <label className="text-sm font-bold">
                  Revision Scheme
                  <select
                    value={revisionScheme}
                    onChange={(event) =>
                      setRevisionScheme(event.target.value as "alphabetic" | "numeric")
                    }
                    className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                  >
                    <option value="alphabetic">Alphabetic (A, B, C...)</option>
                    <option value="numeric">Numeric (1, 2, 3...)</option>
                  </select>
                </label>
              ) : null}

              <label className="text-sm font-bold">
                Revision Note
                <input
                  value={revisionNote}
                  onChange={(event) => setRevisionNote(event.target.value)}
                  placeholder="Optional revision note"
                  className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">
                  Status
                  <select
                    value={statusValue}
                    onChange={(event) => setStatusValue(event.target.value)}
                    className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="text-sm font-bold">
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className={`mt-2 h-10 w-full border px-3 text-sm ${inputClass}`}
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
                </label>
              </div>
            </div>

            {publishMatches.length > 0 ? (
              <div className={`mt-5 border p-4 ${panel}`}>
                <h3 className="text-sm font-bold">Possible existing Vault match</h3>
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
                          setStatus(
                            nextRevision
                              ? `Existing match selected. Kordyne will create Rev ${nextRevision}.`
                              : "Existing match selected. Kordyne will create the next revision.",
                          );
                        }}
                        className={`block w-full border p-3 text-left text-sm ${secondaryButton}`}
                      >
                        <span className="block font-bold">{item.name || item.part_id}</span>
                        <span className={muted}>
                          {item.part_number ? `${item.part_number} - ` : ""}
                          {item.revision ? `Rev ${item.revision}` : "No revision"}
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
                    setStatus("Creating a separate new Vault family.");
                  }}
                  className={`mt-3 h-10 w-full text-sm font-bold ${secondaryButton}`}
                >
                  Create separate new part
                </button>
              </div>
            ) : null}

            <div className={`mt-5 border p-4 ${panel}`}>
              <h3 className="text-sm font-bold">Publish package</h3>
              <p className={`mt-2 text-xs leading-5 ${muted}`}>
                Publish exports STEP automatically and stores an Onshape native
                reference so the feature tree stays editable in Onshape.
              </p>
              {stepFile ? (
                <p className="mt-3 truncate text-xs font-bold text-emerald-500">
                  STEP ready: {stepFile.filename}
                </p>
              ) : (
                <p className={`mt-3 text-xs ${muted}`}>
                  STEP will be exported during publish.
                </p>
              )}
              {thumbnailFile ? (
                <p className="mt-2 truncate text-xs font-bold text-emerald-500">
                  Preview ready: {thumbnailFile.filename}
                </p>
              ) : (
                <p className={`mt-2 text-xs ${muted}`}>
                  Preview will be captured during publish.
                </p>
              )}
              {publishWarning ? (
                <p className="mt-3 text-xs font-semibold text-amber-500">
                  {publishWarning}
                </p>
              ) : null}
              <p className={`mt-3 text-xs ${muted}`}>
                Onshape API:{" "}
                <span
                  className={
                    onshapeApiConnected ? "font-bold text-emerald-500" : "font-bold"
                  }
                >
                  {onshapeApiConnected ? "connected" : "reconnect needed"}
                </span>
              </p>
              {!onshapeApiConnected ? (
                <button
                  type="button"
                  onClick={() => void connectOnshapeApi()}
                  disabled={!connected || busy}
                  className="mt-3 h-10 w-full bg-blue-600 text-sm font-bold text-white disabled:opacity-60"
                >
                  Reconnect Onshape API
                </button>
              ) : null}
            </div>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => void publish()}
                disabled={
                  !connected ||
                  busy ||
                  !publishableContext ||
                  publishStatus === "published"
                }
                className={`h-11 px-5 text-sm font-bold disabled:opacity-60 ${publishButtonClass}`}
              >
                {publishButtonText}
              </button>
              <button
                type="button"
                onClick={() => void exportStepFromOnshape()}
                disabled={!connected || busy || !publishableContext}
                className={`h-10 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                Export STEP only
              </button>
              <button
                type="button"
                onClick={() => void exportThumbnailFromOnshape()}
                disabled={!connected || busy || !publishableContext}
                className={`h-10 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                Capture preview only
              </button>
            </div>
          </section>
        ) : null}

        {activeTab === "library" ? (
          <section className={`p-5 ${card}`}>
            <h2 className="text-xl font-bold">Kordyne Vault Library</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                className={`min-w-0 flex-1 border px-3 py-2 text-sm ${inputClass}`}
                placeholder="Search, or leave blank for all parts"
              />
              <button
                type="button"
                onClick={() => void searchLibrary()}
                disabled={!connected || busy}
                className={`px-4 py-2 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                Search / Refresh
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={libraryStatus}
                onChange={(event) => setLibraryStatus(event.target.value)}
                className={`h-9 border px-2 text-xs ${inputClass}`}
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
                className={`h-9 border px-2 text-xs ${inputClass}`}
              >
                <option value="recent">Recent</option>
                <option value="name_asc">Name A-Z</option>
                <option value="revision_desc">Newest revision</option>
                <option value="status">Status</option>
              </select>
              <select
                value={libraryProcess}
                onChange={(event) => setLibraryProcess(event.target.value)}
                className={`h-9 border px-2 text-xs ${inputClass}`}
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
                className={`h-9 border px-2 text-xs ${inputClass}`}
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
            </div>
            {libraryItems.length > 0 ? (
              <div className="mt-4 space-y-3">
                {libraryItems.map((item) => {
                  const imageUrl =
                    item.thumbnail_signed_url ||
                    item.thumbnail_url ||
                    item.preview_url ||
                    item.image_url ||
                    "";

                  return (
                    <div key={item.part_id} className={`border p-3 text-sm ${panel}`}>
                      <div className="flex gap-3">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- Signed Vault thumbnail URLs are short-lived.
                          <img
                            src={imageUrl}
                            alt=""
                            className="h-14 w-14 border border-slate-300 object-cover"
                          />
                        ) : null}
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
                          <p className={`mt-1 truncate text-xs ${muted}`}>
                            {[item.process_type, item.category, item.status]
                              .filter(Boolean)
                              .join(" - ") || "No classification"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => linkLibraryPart(item, "publish")}
                          className={`h-9 text-xs font-bold ${secondaryButton}`}
                        >
                          Revise
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            linkLibraryPart(item, "pull");
                            void pull(item);
                          }}
                          disabled={busy}
                          className={`h-9 text-xs font-bold disabled:opacity-60 ${secondaryButton}`}
                        >
                          Pull
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            linkLibraryPart(item, "compare");
                            void compare(item);
                          }}
                          disabled={busy}
                          className={`h-9 text-xs font-bold disabled:opacity-60 ${secondaryButton}`}
                        >
                          Compare
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : libraryLoaded ? (
              <div className={`mt-4 border p-4 text-sm ${panel}`}>
                No Kordyne parts match the current library filters.
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "pull" ? (
          <section className={`p-5 ${card}`}>
            <h2 className="text-xl font-bold">Pull from Kordyne</h2>
            <p className={`mt-3 text-sm leading-6 ${muted}`}>
              Pull opens the native Onshape source when Kordyne has one, or
              imports the STEP exchange file into a new Onshape document.
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
              className="mt-5 h-11 w-full bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
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
            <h2 className="text-xl font-bold">Compare with Kordyne</h2>
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
              className="mt-5 h-11 w-full bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              Open Compare
            </button>
            {compareStepPackage?.step_file?.signed_url ? (
              <a
                href={compareStepPackage.step_file.signed_url}
                target="_blank"
                rel="noreferrer"
                className={`mt-3 block h-11 px-5 py-3 text-center text-sm font-bold ${secondaryButton}`}
              >
                Download latest STEP
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
                className={`h-10 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
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
                className={`h-10 text-sm font-bold disabled:opacity-60 ${secondaryButton}`}
              >
                Publish Rev
              </button>
            </div>
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
