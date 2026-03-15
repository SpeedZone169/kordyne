"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
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
        });
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [onVerify]);

  return <div ref={containerRef} />;
}