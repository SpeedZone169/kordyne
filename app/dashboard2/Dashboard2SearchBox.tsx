"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type Dashboard2SearchSuggestion = {
  id: string;
  type: "part" | "project" | "request";
  label: string;
  subtitle: string;
  href: string;
  updatedAt: string;
  thumbnailUrl?: string | null;
};

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SuggestionIcon({
  type,
  thumbnailUrl,
}: {
  type: Dashboard2SearchSuggestion["type"];
  thumbnailUrl?: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const label = type === "part" ? "P" : type === "project" ? "PR" : "R";

  if (thumbnailUrl && !imageFailed && type !== "request") {
    return (
      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/14 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- Vault preview URLs are short-lived signed URLs. */}
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00bdde]/30 bg-[#00bdde]/12 text-[10px] font-black tracking-[0.08em] text-[#8ff2ff]">
      {label}
    </span>
  );
}

function typeLabel(type: Dashboard2SearchSuggestion["type"]) {
  if (type === "part") return "Part";
  if (type === "project") return "Project";
  return "Request";
}

export default function Dashboard2SearchBox() {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Dashboard2SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const cacheRef = useRef(new Map<string, Dashboard2SearchSuggestion[]>());

  useEffect(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      setSuggestions([]);
      setIsLoading(false);
      setSearchFailed(false);
      return;
    }

    const cached = cacheRef.current.get(normalizedQuery);
    if (cached) {
      setSuggestions(cached);
      setIsLoading(false);
      setSearchFailed(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchFailed(false);

      try {
        const response = await fetch(
          `/api/dashboard/search?q=${encodeURIComponent(normalizedQuery)}`,
          {
            credentials: "same-origin",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Dashboard search failed.");
        }

        const payload = (await response.json()) as {
          suggestions?: Dashboard2SearchSuggestion[];
        };
        const nextSuggestions = payload.suggestions ?? [];
        cacheRef.current.set(normalizedQuery, nextSuggestions);
        setSuggestions(nextSuggestions);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
          setSearchFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const showSuggestions = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full md:max-w-[520px]">
      <form
        action="/dashboard/parts"
        className="flex h-10 w-full items-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-3 text-white shadow-[0_18px_36px_-28px_rgba(0,0,0,0.85)] backdrop-blur transition focus-within:border-[#00bdde]/80 focus-within:bg-white/[0.12] focus-within:shadow-[0_0_0_1px_rgba(0,189,222,0.18),0_18px_38px_-28px_rgba(0,189,222,0.9)]"
      >
        <SearchIcon className="h-4 w-4 shrink-0 text-[#00bdde]" />
        <input
          name="q"
          type="search"
          value={query}
          onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Search parts, projects, requests, suppliers..."
          className="min-w-0 flex-1 bg-transparent text-[12.5px] text-white outline-none placeholder:text-white/45"
        />
        <Image
          src="/favicon.png"
          alt=""
          width={22}
          height={22}
          className="h-5 w-5 shrink-0 rounded-md"
        />
      </form>

      {showSuggestions ? (
        <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-white/12 bg-white/[0.10] p-1.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          {isLoading ? (
            <div className="rounded-xl px-3 py-4 text-[12px] text-white/58">
              Searching your workspace...
            </div>
          ) : searchFailed ? (
            <div className="rounded-xl px-3 py-4 text-[12px] text-white/58">
              Search is temporarily unavailable. Press Enter to search the Vault.
            </div>
          ) : suggestions.length > 0 ? (
            <div className="dashboard2-search-scroll max-h-[320px] overflow-y-auto pr-1">
              {suggestions.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white transition hover:bg-white/[0.10]"
                  onClick={() => setIsFocused(false)}
                >
                  <SuggestionIcon
                    type={item.type}
                    thumbnailUrl={item.thumbnailUrl}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[12.5px] font-semibold">
                        {item.label}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#8ff2ff]">
                        {typeLabel(item.type)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-white/54">
                      {item.subtitle}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl px-3 py-4 text-[12px] text-white/58">
              No matching parts, projects, or requests.
            </div>
          )}
          <style jsx>{`
            .dashboard2-search-scroll {
              scrollbar-width: thin;
              scrollbar-color: rgba(0, 189, 222, 0.48) rgba(255, 255, 255, 0.08);
            }

            .dashboard2-search-scroll::-webkit-scrollbar {
              width: 7px;
            }

            .dashboard2-search-scroll::-webkit-scrollbar-track {
              background: rgba(255, 255, 255, 0.08);
              border-radius: 999px;
              margin: 8px 0;
            }

            .dashboard2-search-scroll::-webkit-scrollbar-thumb {
              background: linear-gradient(
                180deg,
                rgba(0, 189, 222, 0.65),
                rgba(0, 189, 222, 0.3)
              );
              border-radius: 999px;
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}
