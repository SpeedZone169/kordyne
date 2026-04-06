"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  fileId: string;
  fileName: string;
};

type Phase =
  | "idle"
  | "preparing"
  | "translating"
  | "loading"
  | "ready"
  | "disabled"
  | "error";

type AutodeskAccessTokenCallback = (token: string, expires: number) => void;

type AutodeskBubbleNode = unknown;

type AutodeskDocumentRoot = {
  getDefaultGeometry(): AutodeskBubbleNode | null;
  search(query: { type: string }): AutodeskBubbleNode[];
};

type AutodeskDocument = {
  getRoot(): AutodeskDocumentRoot;
};

type AutodeskViewerInstance = {
  start(): number;
  finish(): void;
  loadDocumentNode(
    doc: AutodeskDocument,
    node: AutodeskBubbleNode,
  ): Promise<unknown>;
};

type AutodeskViewingNamespace = {
  Initializer(
    options: {
      env: string;
      api: string;
      getAccessToken: (
        callback: AutodeskAccessTokenCallback,
      ) => void | Promise<void>;
    },
    callback: () => void,
  ): void;
  GuiViewer3D: new (
    container: HTMLElement,
    options: { extensions: string[] },
  ) => AutodeskViewerInstance;
  Document: {
    load(
      urn: string,
      onSuccess: (doc: AutodeskDocument) => void,
      onFailure: (code: number, errorMsg: string) => void,
    ): void;
  };
  FeatureFlags?: {
    set(name: string, enabled: boolean): void;
  };
};

declare global {
  interface Window {
    Autodesk?: {
      Viewing?: AutodeskViewingNamespace;
    };
  }
}

const VIEWER_VERSION =
  process.env.NEXT_PUBLIC_APS_VIEWER_VERSION || "7.108.0";

let viewerAssetsPromise: Promise<void> | null = null;

function ensureViewerAssets() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.Autodesk?.Viewing) {
    return Promise.resolve();
  }

  if (viewerAssetsPromise) {
    return viewerAssetsPromise;
  }

  viewerAssetsPromise = new Promise<void>((resolve, reject) => {
    const cssId = "aps-viewer-style";
    const scriptId = "aps-viewer-script";

    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_VERSION}/style.min.css`;
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById(
      scriptId,
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.Autodesk?.Viewing) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load APS Viewer script.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://developer.api.autodesk.com/modelderivative/v2/viewers/${VIEWER_VERSION}/viewer3D.min.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load APS Viewer script."));
    document.head.appendChild(script);
  });

  return viewerAssetsPromise;
}

function getManifestStatus(manifest: unknown): string {
  if (!manifest || typeof manifest !== "object") {
    return "";
  }

  const record = manifest as Record<string, unknown>;
  return typeof record.status === "string" ? record.status.toLowerCase() : "";
}

function getManifestProgress(manifest: unknown): string {
  if (!manifest || typeof manifest !== "object") {
    return "";
  }

  const record = manifest as Record<string, unknown>;
  return typeof record.progress === "string" ? record.progress : "";
}

export default function ApsProviderPackageFilePreview({
  fileId,
  fileName,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<AutodeskViewerInstance | null>(null);
  const urnCacheRef = useRef<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("Preparing STEP preview...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setPhase("preparing");
        setMessage("Preparing STEP preview...");

        let urn = urnCacheRef.current[fileId];

        if (!urn) {
          const prepareResponse = await fetch(
            `/api/aps/provider-package-files/${fileId}/prepare`,
            {
              method: "POST",
              cache: "no-store",
            },
          );

          const preparePayload = (await prepareResponse.json()) as {
            urn?: string;
            error?: string;
          };

          if (prepareResponse.status === 503) {
            setPhase("disabled");
            setMessage("STEP preview is disabled in this environment.");
            return;
          }

          if (!prepareResponse.ok || !preparePayload.urn) {
            throw new Error(
              preparePayload.error || "Failed to prepare STEP preview.",
            );
          }

          urn = preparePayload.urn;
          urnCacheRef.current[fileId] = urn;
        }

        setPhase("translating");
        setMessage("Translating STEP model for browser viewing...");

        let ready = false;

        for (let i = 0; i < 40; i += 1) {
          if (cancelled) return;

          const manifestResponse = await fetch(
            `/api/aps/provider-package-files/${fileId}/manifest?urn=${encodeURIComponent(
              urn,
            )}`,
            {
              cache: "no-store",
            },
          );

          const manifestPayload = (await manifestResponse.json()) as {
            manifest?: unknown;
            error?: string;
          };

          if (manifestResponse.status === 503) {
            setPhase("disabled");
            setMessage("STEP preview is disabled in this environment.");
            return;
          }

          if (!manifestResponse.ok) {
            throw new Error(
              manifestPayload.error || "Failed to get STEP preview manifest.",
            );
          }

          const manifest = manifestPayload.manifest;

          if (!manifest) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            continue;
          }

          const status = getManifestStatus(manifest);
          const progress = getManifestProgress(manifest);

          if (status === "success") {
            ready = true;
            break;
          }

          if (status === "failed") {
            throw new Error("APS translation failed for this STEP file.");
          }

          setMessage(
            progress
              ? `Translating STEP model... ${progress}`
              : "Translating STEP model...",
          );

          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        if (!ready) {
          throw new Error(
            "STEP translation is still in progress. Try again shortly.",
          );
        }

        if (cancelled) return;

        setPhase("loading");
        setMessage("Loading STEP viewer...");

        await ensureViewerAssets();

        if (cancelled || !containerRef.current) return;

        const Viewing = window.Autodesk?.Viewing;

        if (!Viewing) {
          throw new Error("APS Viewer runtime is unavailable.");
        }

        if (typeof Viewing.FeatureFlags?.set === "function") {
          Viewing.FeatureFlags.set("DS_ENDPOINTS", true);
        }

        const getAccessToken = async (
          callback: AutodeskAccessTokenCallback,
        ) => {
          const tokenResponse = await fetch("/api/aps/token", {
            cache: "no-store",
          });
          const tokenPayload = (await tokenResponse.json()) as {
            access_token?: string;
            expires_in?: number;
            error?: string;
          };

          if (!tokenResponse.ok || !tokenPayload.access_token) {
            throw new Error(
              tokenPayload.error || "Failed to get APS viewer token.",
            );
          }

          callback(tokenPayload.access_token, tokenPayload.expires_in ?? 1800);
        };

        await new Promise<void>((resolve) => {
          Viewing.Initializer(
            {
              env: "AutodeskProduction2",
              api: "streamingV2",
              getAccessToken,
            },
            () => resolve(),
          );
        });

        if (viewerRef.current) {
          viewerRef.current.finish();
          viewerRef.current = null;
        }

        containerRef.current.innerHTML = "";

        const viewer = new Viewing.GuiViewer3D(containerRef.current, {
          extensions: [],
        });

        const startedCode = viewer.start();

        if (startedCode > 0) {
          throw new Error("Failed to start APS Viewer.");
        }

        viewerRef.current = viewer;

        await new Promise<void>((resolve, reject) => {
          Viewing.Document.load(
            `urn:${urn}`,
            async (doc: AutodeskDocument) => {
              try {
                const root = doc.getRoot();
                const defaultNode =
                  root.getDefaultGeometry() || root.search({ type: "geometry" })[0];

                if (!defaultNode) {
                  reject(
                    new Error(
                      "No STEP geometry was found in the translated model.",
                    ),
                  );
                  return;
                }

                await viewer.loadDocumentNode(doc, defaultNode);
                resolve();
              } catch (loadError) {
                reject(
                  loadError instanceof Error
                    ? loadError
                    : new Error("Failed to load STEP geometry."),
                );
              }
            },
            (_code: number, errorMsg: string) => {
              reject(new Error(errorMsg || "Failed to load STEP document."));
            },
          );
        });

        if (cancelled) return;

        setPhase("ready");
      } catch (error) {
        if (cancelled) return;

        console.error("APS provider STEP preview error:", error);
        setPhase("error");
        setMessage(
          error instanceof Error ? error.message : "STEP preview failed.",
        );
      }
    }

    run();

    return () => {
      cancelled = true;

      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
    };
  }, [fileId, fileName]);

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#f5f3ff,#f8fafc_55%,#ffffff)]">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        STEP preview · APS viewer
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {phase !== "ready" ? (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-lg rounded-[24px] border border-slate-200 bg-white/95 p-6 text-center shadow-sm backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">
              {phase === "disabled" ? "STEP preview disabled" : "Preparing model"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
            <p className="mt-4 text-xs text-slate-400">File: {fileName}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}