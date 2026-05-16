"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onError?: (message: string) => void;
};

const turnstileUnavailableMessage =
  "Security check could not load. Refresh the page or contact Kordyne support if it continues.";
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const turnstileMissingMessage = turnstileSiteKey
  ? ""
  : "Security check is not configured for this environment.";

export default function TurnstileWidget({ onVerify, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onErrorRef = useRef(onError);
  const onVerifyRef = useRef(onVerify);
  const widgetIdRef = useRef<string | null>(null);
  const [message, setMessage] = useState(turnstileMissingMessage);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onErrorRef.current = onError;
  }, [onError, onVerify]);

  useEffect(() => {
    onVerifyRef.current("");

    const container = containerRef.current;
    if (!container) return;
    const widgetContainer = container;
    const siteKey = turnstileSiteKey ?? "";

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
        callback: (token: string) => {
          setMessage("");
          onVerifyRef.current(token);
        },
        "expired-callback": () => {
          onVerifyRef.current("");
        },
        "error-callback": () => {
          setMessage(turnstileUnavailableMessage);
          onVerifyRef.current("");
          onErrorRef.current?.(turnstileUnavailableMessage);
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
  }, []);

  return (
    <>
      <div ref={containerRef} />
      {message ? (
        <p className="mt-2 text-xs leading-5 text-rose-600">{message}</p>
      ) : null}
    </>
  );
}
