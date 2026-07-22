"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./TurnstileWidget.module.css";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          action?: string;
          appearance?: "always" | "execute" | "interaction-only";
          language?: string;
          size?: "normal" | "compact" | "flexible";
          theme?: "light" | "dark" | "auto";
          "expired-callback"?: () => void;
          "error-callback"?: (errorCode?: string) => boolean | void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onError?: (message: string) => void;
  action?: string;
};

const turnstileDevelopmentSiteKey = "1x00000000000000000000AA";
const turnstileUnavailableMessage =
  "Security check could not load. Refresh the page or contact Kordyne support if it continues.";
const turnstileMissingMessage =
  "Security check is not configured for this environment.";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function getTurnstileSiteKey() {
  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return turnstileDevelopmentSiteKey;
  }

  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

function getTurnstileErrorMessage(errorCode?: string) {
  if (errorCode === "110200") {
    return "Security check is not authorized for this address. Refresh the page or contact Kordyne support.";
  }

  if (errorCode === "200500") {
    return "Security check was blocked from loading. Check your connection or browser privacy settings and try again.";
  }

  return turnstileUnavailableMessage;
}

export default function TurnstileWidget({
  onVerify,
  onError,
  action,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onErrorRef = useRef(onError);
  const onVerifyRef = useRef(onVerify);
  const widgetIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
  }, [onError, onVerify]);

  useEffect(() => {
    onVerifyRef.current("");

    const container = containerRef.current;
    if (!container) return;
    const widgetContainer = container;
    const siteKey = getTurnstileSiteKey();

    if (!siteKey) {
      onErrorRef.current?.(turnstileMissingMessage);
      return;
    }

    let cancelled = false;

    function renderWidget() {
      if (
        cancelled ||
        widgetIdRef.current ||
        !window.turnstile ||
        !widgetContainer.isConnected
      ) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(widgetContainer, {
        sitekey: siteKey,
        action,
        appearance: "always",
        language: "en",
        size: "flexible",
        theme: "dark",
        callback: (token: string) => {
          setMessage("");
          onVerifyRef.current(token);
        },
        "expired-callback": () => {
          onVerifyRef.current("");
        },
        "error-callback": (errorCode?: string) => {
          const errorMessage = getTurnstileErrorMessage(errorCode);

          if (errorCode) {
            console.warn(`Cloudflare Turnstile error: ${errorCode}`);
          }

          setMessage(errorMessage);
          onVerifyRef.current("");
          onErrorRef.current?.(errorMessage);
          return true;
        },
      });

      window.clearTimeout(unavailableTimeout);
    }

    const interval = setInterval(() => {
      renderWidget();

      if (widgetIdRef.current) {
        clearInterval(interval);
      }
    }, 300);

    const unavailableTimeout = window.setTimeout(() => {
      if (cancelled || widgetIdRef.current) {
        return;
      }

      setMessage(turnstileUnavailableMessage);
      onVerifyRef.current("");
      onErrorRef.current?.(turnstileUnavailableMessage);
      clearInterval(interval);
    }, 10000);

    renderWidget();

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.clearTimeout(unavailableTimeout);

      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;

      if (widgetId && widgetContainer.isConnected && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // Turnstile can already be gone if navigation unmounts the iframe first.
        }
      }
    };
  }, [action]);

  return (
    <div className={styles.root}>
      <div ref={containerRef} className={styles.widget} />
      {message ? (
        <p className={styles.message} role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
