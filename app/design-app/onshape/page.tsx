"use client";

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
  revision?: string | null;
  status?: string | null;
};

type UploadedDesignFile = {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  role: "step" | "native" | "thumbnail";
  file_extension?: string | null;
};

const TOKEN_STORAGE_KEY = "kordyne:onshape:connection-token";
const ONSHAPE_EXTENSION_ACTION_URL =
  "https://www.kordyne.com/design-app/onshape?documentId={$documentId}&workspaceOrVersion={$workspaceOrVersion}&workspaceOrVersionId={$workspaceOrVersionId}&elementId={$elementId}&tabElementId={$tabElementId}&partNumber={$partNumber}&revision={$revision}&configuration={$configuration}";

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
  if (context.partNumber) return context.partNumber;
  if (context.partId) return `Onshape part ${context.partId}`;
  if (context.elementId) return `Onshape element ${context.elementId}`;
  if (context.documentId) return `Onshape document ${context.documentId}`;
  return "Onshape design";
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
  const [onshapeApiConnected, setOnshapeApiConnected] = useState(false);
  const [libraryItems, setLibraryItems] = useState<PublishedPart[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");

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
      setStatus("Connected to Kordyne.");
      return payload;
    },
    [callOnshapeApi],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const parsedContext = parseOnshapeContext();
      setContext(parsedContext);
      setLibraryQuery(parsedContext.partNumber || "");

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

  async function exportStepFromOnshape() {
    if (!context || !token) return;

    setState("working");
    setStatus("Exporting STEP from Onshape...");

    try {
      const response = await fetch("/api/design-app/onshape/export-step", {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          ...context,
          externalName: displayNameForContext(context),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        needs_onshape_oauth?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (payload.needs_onshape_oauth) {
        setOnshapeApiConnected(false);
        setState("connected");
        setStatus("Connect Onshape API access before exporting STEP.");
        return;
      }

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "Onshape STEP export failed.");
      }

      setStepFile(payload.file);
      setOnshapeApiConnected(true);
      setState("connected");
      setStatus(payload.message || "Onshape STEP export attached.");
    } catch (error) {
      setState("error");
      setStatus(
        error instanceof Error ? error.message : "Onshape STEP export failed.",
      );
    }
  }

  async function publish() {
    if (!context || !token) return;

    setState("working");
    setStatus("Publishing Onshape reference to Kordyne...");

    try {
      const publishMode = lastPart?.part_id ? "new_revision" : "new_family";
      const payload = await callOnshapeApi<{
        ok: boolean;
        part_id: string;
        part_family_id: string;
        name: string | null;
        revision: string | null;
        status: string | null;
        message?: string;
      }>("/api/design-app/onshape/publish", {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: randomIdempotencyKey(),
          part_id: publishMode === "new_revision" ? lastPart?.part_id : null,
          external_workspace_id: context.workspaceId || null,
          external_project_id: context.companyId || null,
          external_document_id: context.documentId || null,
          external_item_id:
            context.partId || context.elementId || context.tabElementId || null,
          external_version_id:
            context.microversionId || context.versionId || null,
          external_revision_id: context.revision || null,
          external_name: displayNameForContext(context),
          external_url: context.externalUrl || null,
          metadata: {
            publish_mode: publishMode,
            name: displayNameForContext(context),
            part_number: context.partNumber || null,
            revision_note: "Published from Onshape.",
            cad_metadata: {
              ...context,
              native_source: "onshape_document_reference",
            },
          },
          files: stepFile ? [stepFile] : [],
        }),
      });

      const nextPart = {
        part_id: payload.part_id,
        part_family_id: payload.part_family_id,
        name: payload.name,
        revision: payload.revision,
        status: payload.status,
      };

      setLastPart(nextPart);
      setState("connected");
      setStatus(
        payload.revision
          ? `Published to Kordyne as revision ${payload.revision}.`
          : "Published to Kordyne.",
      );
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Publish failed.");
    }
  }

  async function uploadStepFile(file: File) {
    if (!token) {
      setStatus("Connect to Kordyne before attaching STEP.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".step") && !lowerName.endsWith(".stp")) {
      setState("error");
      setStatus("Only STEP files with .step or .stp extension can be attached.");
      return;
    }

    setState("working");
    setStatus("Uploading STEP exchange file...");

    try {
      const formData = new FormData();
      formData.set("role", "step");
      formData.set("file", file);

      const response = await fetch("/api/design-app/onshape/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        file?: UploadedDesignFile;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.file) {
        throw new Error(payload.error || "STEP upload failed.");
      }

      setStepFile(payload.file);
      setState("connected");
      setStatus(payload.message || "STEP exchange file attached.");
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "STEP upload failed.");
    }
  }

  async function compare() {
    if (!lastPart?.part_id) {
      setStatus("Publish or link this Onshape context before compare.");
      return;
    }

    setState("working");
    setStatus("Checking Kordyne revision status...");

    try {
      const payload = await callOnshapeApi<{
        ok: boolean;
        status: { is_latest_revision: boolean };
        current: { revision?: string | null };
        latest: { revision?: string | null };
      }>("/api/design-app/onshape/compare-status", {
        method: "POST",
        body: JSON.stringify({ part_id: lastPart.part_id }),
      });

      setState("connected");
      setStatus(
        payload.status.is_latest_revision
          ? `Current Kordyne source is latest revision ${payload.current.revision ?? ""}.`
          : `Kordyne has newer revision ${payload.latest.revision ?? ""}.`,
      );
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Compare failed.");
    }
  }

  async function pull() {
    if (!lastPart?.part_id) {
      setStatus("Publish or link a Kordyne part before pull.");
      return;
    }

    setState("working");
    setStatus("Preparing Kordyne native references...");

    try {
      const payload = await callOnshapeApi<{
        ok: boolean;
        files: Array<{ filename: string; signed_url: string }>;
      }>("/api/design-app/onshape/pull-native", {
        method: "POST",
        body: JSON.stringify({ part_id: lastPart.part_id }),
      });

      setState("connected");
      setStatus(
        payload.files.length === 1
          ? `Native reference ready: ${payload.files[0].filename}.`
          : `${payload.files.length} native references are ready.`,
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
      }>("/api/design-app/onshape/library-search", {
        method: "POST",
        body: JSON.stringify({
          q: libraryQuery,
          limit: 10,
        }),
      });

      setLibraryItems(payload.items);
      setState("connected");
      setStatus(
        payload.items.length > 0
          ? "Select a Kordyne part to link this Onshape context."
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
    setOnshapeApiConnected(false);
    setState("not_connected");
    setStatus("Disconnected. Connect again when you are ready.");
  }

  const connected = state === "connected" || state === "working";
  const busy =
    state === "checking" ||
    state === "opening_browser" ||
    state === "waiting" ||
    state === "working";
  const contextName = context ? displayNameForContext(context) : "Onshape design";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-950">
      <div className="mx-auto max-w-xl space-y-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Kordyne
            </p>
            <h1 className="text-xl font-semibold">Onshape workspace</h1>
          </div>

          <span
            className={
              connected
                ? "rounded-[8px] bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"
                : "rounded-[8px] bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
            }
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </header>

        <section className="rounded-[8px] border border-slate-300 bg-white p-4">
          <h2 className="text-base font-semibold">Active Onshape context</h2>
          <p className="mt-2 text-sm text-slate-700">{contextName}</p>
          <dl className="mt-4 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="font-semibold text-slate-600">Document</dt>
            <dd className="truncate">{context?.documentId || "-"}</dd>
            <dt className="font-semibold text-slate-600">Element</dt>
            <dd className="truncate">{context?.elementId || "-"}</dd>
            <dt className="font-semibold text-slate-600">Part</dt>
            <dd className="truncate">{context?.partId || "-"}</dd>
            <dt className="font-semibold text-slate-600">Revision</dt>
            <dd>{context?.revision || "-"}</dd>
          </dl>
          {context && !publishableContext ? (
            <div className="mt-4 rounded-[8px] border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              <p className="font-semibold">Onshape did not pass document context.</p>
              <p className="mt-1">
                Update the extension Action URL to include Onshape parameters:
              </p>
              <code className="mt-2 block break-all rounded-[6px] bg-white p-2 text-[11px] text-slate-900">
                {ONSHAPE_EXTENSION_ACTION_URL}
              </code>
            </div>
          ) : null}
        </section>

        <section className="rounded-[8px] border border-slate-300 bg-white p-4">
          <h2 className="text-base font-semibold">Kordyne connection</h2>
          {profile ? (
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="font-semibold text-slate-600">User</dt>
              <dd className="truncate">
                {profile.user?.full_name || profile.user?.email || "-"}
              </dd>
              <dt className="font-semibold text-slate-600">Organization</dt>
              <dd className="truncate">{profile.organization?.name || "-"}</dd>
              <dt className="font-semibold text-slate-600">Role</dt>
              <dd>{profile.membership?.role || "-"}</dd>
              <dt className="font-semibold text-slate-600">Onshape API</dt>
              <dd>{onshapeApiConnected ? "Connected" : "Not connected"}</dd>
            </dl>
          ) : (
            <p className="mt-2 text-sm text-slate-700">
              Connect once, then publish and compare directly from Onshape.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!connected ? (
              <button
                type="button"
                onClick={() => void connect()}
                disabled={busy}
                className="rounded-[8px] bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Connect
              </button>
            ) : (
              <button
                type="button"
                onClick={disconnect}
                disabled={busy}
                className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Disconnect
              </button>
            )}
          </div>
        </section>

        <section className="rounded-[8px] border border-slate-300 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Publish</h2>
            {lastPart ? (
              <span className="text-xs font-semibold text-slate-600">
                Linked {lastPart.revision ? `rev ${lastPart.revision}` : "part"}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-slate-700">
            Kordyne stores the Onshape native document reference so the feature
            tree remains in Onshape instead of being reduced to STEP.
          </p>

          <div className="mt-4 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
            <label className="block text-sm font-semibold text-slate-700">
              STEP exchange file
              <input
                type="file"
                accept=".step,.stp,application/step,model/step"
                disabled={!connected || busy}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadStepFile(file);
                }}
                className="mt-2 block w-full text-sm file:mr-3 file:rounded-[8px] file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white disabled:opacity-60"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {!onshapeApiConnected ? (
                <button
                  type="button"
                  onClick={() => void connectOnshapeApi()}
                  disabled={!connected || busy}
                  className="rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Connect Onshape API
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void exportStepFromOnshape()}
                disabled={!connected || busy || !publishableContext}
                className="rounded-[8px] border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                Export STEP from Onshape
              </button>
            </div>
            {stepFile ? (
              <p className="mt-2 truncate text-xs font-semibold text-emerald-700">
                Attached {stepFile.filename}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-600">
                Optional neutral file for supplier exchange.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void publish()}
              disabled={!connected || busy || !publishableContext}
              className="rounded-[8px] bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              Publish to Kordyne
            </button>
            <button
              type="button"
              onClick={() => void pull()}
              disabled={!connected || busy || !lastPart}
              className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Pull
            </button>
            <button
              type="button"
              onClick={() => void compare()}
              disabled={!connected || busy || !lastPart}
              className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Compare
            </button>
          </div>
        </section>

        <section className="rounded-[8px] border border-slate-300 bg-white p-4">
          <h2 className="text-base font-semibold">Library</h2>
          <div className="mt-3 flex gap-2">
            <input
              value={libraryQuery}
              onChange={(event) => setLibraryQuery(event.target.value)}
              className="min-w-0 flex-1 rounded-[8px] border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search Kordyne parts"
            />
            <button
              type="button"
              onClick={() => void searchLibrary()}
              disabled={!connected || busy}
              className="rounded-[8px] border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              Search
            </button>
          </div>

          {libraryItems.length > 0 ? (
            <div className="mt-3 space-y-2">
              {libraryItems.slice(0, 5).map((item) => (
                <button
                  key={item.part_id}
                  type="button"
                  onClick={() => {
                    setLastPart(item);
                    setStatus("Linked this Onshape context to a Kordyne part.");
                  }}
                  className="block w-full rounded-[8px] border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-500"
                >
                  <span className="block font-semibold">
                    {item.name || item.part_id}
                  </span>
                  <span className="text-slate-600">
                    {item.revision ? `Revision ${item.revision}` : "No revision"}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <p
          className={
            state === "error"
              ? "rounded-[8px] border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              : "rounded-[8px] border border-slate-200 bg-white p-3 text-sm text-slate-700"
          }
        >
          {status}
        </p>
      </div>
    </main>
  );
}
