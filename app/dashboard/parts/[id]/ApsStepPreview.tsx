"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Autodesk?: any;
  }
}

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

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load APS Viewer script.")),
        { once: true },
      );

      if (window.Autodesk?.Viewing) {
        resolve();
      }

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

function getManifestStatus(manifest: any): string {
  return String(manifest?.status || "").toLowerCase();
}

function getManifestProgress(manifest: any): string {
  return String(manifest?.progress || "");
}

export default function ApsStepPreview({ fileId, fileName }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
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
            `/api/aps/part-files/${fileId}/prepare`,
            {
              method: "POST",
              cache: "no-store",
            },
          );

          const preparePayload = await prepareResponse.json();

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

          urn = String(preparePayload.urn);
          urnCacheRef.current[fileId] = urn;
        }

        setPhase("translating");
        setMessage("Translating STEP model for browser viewing...");

        let manifest: any = null;
        let ready = false;

        for (let i = 0; i < 40; i += 1) {
          if (cancelled) return;

          const manifestResponse = await fetch(
            `/api/aps/part-files/${fileId}/manifest?urn=${encodeURIComponent(urn)}`,
            {
              cache: "no-store",
            },
          );

          const manifestPayload = await manifestResponse.json();

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

          manifest = manifestPayload.manifest;

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
          throw new Error("STEP translation is still in progress. Try again shortly.");
        }

        if (cancelled) return;

        setPhase("loading");
        setMessage("Loading STEP viewer...");

        await ensureViewerAssets();

        if (cancelled || !containerRef.current) return;

        const Autodesk = window.Autodesk;

        if (!Autodesk?.Viewing) {
          throw new Error("APS Viewer runtime is unavailable.");
        }

        if (typeof Autodesk.Viewing.FeatureFlags?.set === "function") {
          Autodesk.Viewing.FeatureFlags.set("DS_ENDPOINTS", true);
        }

        const getAccessToken = async (callback: (token: string, expires: number) => void) => {
          const tokenResponse = await fetch("/api/aps/token", {
            cache: "no-store",
          });
          const tokenPayload = await tokenResponse.json();

          if (!tokenResponse.ok) {
            throw new Error(tokenPayload.error || "Failed to get APS viewer token.");
          }

          callback(tokenPayload.access_token, tokenPayload.expires_in);
        };

        await new Promise<void>((resolve, reject) => {
          Autodesk.Viewing.Initializer(
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

        const viewer = new Autodesk.Viewing.GuiViewer3D(containerRef.current, {
          extensions: [],
        });

        const startedCode = viewer.start();

        if (startedCode > 0) {
          throw new Error("Failed to start APS Viewer.");
        }

        viewerRef.current = viewer;

        await new Promise<void>((resolve, reject) => {
          Autodesk.Viewing.Document.load(
            `urn:${urn}`,
            async (doc: any) => {
              try {
                const defaultNode =
                  doc.getRoot().getDefaultGeometry() ||
                  doc.getRoot().search({ type: "geometry" })?.[0];

                if (!defaultNode) {
                  reject(new Error("No STEP geometry was found in the translated model."));
                  return;
                }

                await viewer.loadDocumentNode(doc, defaultNode);
                resolve();
              } catch (loadError) {
                reject(loadError);
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

        console.error("APS STEP preview error:", error);
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
  }, [fileId]);

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
            <p className="mt-4 text-xs text-slate-400">
              File: {fileName}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}