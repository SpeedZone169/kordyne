"use client";

import Script from "next/script";
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
      ) => void;
      remove?: (container: HTMLElement) => void;
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
  const [message, setMessage] = useState(turnstileMissingMessage);

  useEffect(() => {
    onVerify("");

    const container = containerRef.current;
    if (!container) return;

    if (!turnstileSiteKey) {
      onError?.(turnstileMissingMessage);
      return;
    }

    const interval = setInterval(() => {
      if (window.turnstile && container.childNodes.length === 0) {
        window.turnstile.render(container, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            setMessage("");
            onVerify(token);
          },
          "expired-callback": () => {
            onVerify("");
          },
          "error-callback": () => {
            setMessage(turnstileUnavailableMessage);
            onVerify("");
            onError?.(turnstileUnavailableMessage);
          },
        });
        clearInterval(interval);
      }
    }, 300);

    return () => {
      clearInterval(interval);

      if (window.turnstile?.remove) {
        window.turnstile.remove(container);
      }
    };
  }, [onError, onVerify]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onError={() => {
          setMessage(turnstileUnavailableMessage);
          onVerify("");
          onError?.(turnstileUnavailableMessage);
        }}
      />
      <div ref={containerRef} />
      {message ? (
        <p className="mt-2 text-xs leading-5 text-rose-600">{message}</p>
      ) : null}
    </>
  );
}
