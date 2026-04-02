"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

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
};

export default function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onVerify("");

    const container = containerRef.current;
    if (!container) return;

    const interval = setInterval(() => {
      if (window.turnstile && container.childNodes.length === 0) {
        window.turnstile.render(container, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!,
          callback: (token: string) => {
            onVerify(token);
          },
          "expired-callback": () => {
            onVerify("");
          },
          "error-callback": () => {
            onVerify("");
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
  }, [onVerify]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div ref={containerRef} />
    </>
  );
}