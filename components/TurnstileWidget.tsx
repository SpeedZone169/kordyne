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

    const interval = setInterval(() => {
      if (
        window.turnstile &&
        containerRef.current &&
        containerRef.current.childNodes.length === 0
      ) {
        window.turnstile.render(containerRef.current, {
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

      if (window.turnstile && containerRef.current && window.turnstile.remove) {
        window.turnstile.remove(containerRef.current);
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