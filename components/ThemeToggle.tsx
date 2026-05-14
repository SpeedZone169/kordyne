"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem("kordyne-theme", theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("kordyne-theme") === "dark"
      ? "dark"
      : "light";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-300/70 bg-white/90 p-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white"
      aria-label="Toggle dark and light theme"
    >
      <span
        className={`rounded-full px-2.5 py-1 transition ${
          theme === "light" ? "bg-slate-950 text-white" : "text-slate-500"
        }`}
      >
        Light
      </span>
      <span
        className={`rounded-full px-2.5 py-1 transition ${
          theme === "dark" ? "bg-slate-950 text-white" : "text-slate-500"
        }`}
      >
        Dark
      </span>
    </button>
  );
}
