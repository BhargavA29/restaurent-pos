"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

const STORAGE_KEY = "color-scheme";

function getSystemScheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredScheme(): "light" | "dark" | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyMetaScheme(value: "light" | "dark" | "light dark") {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = value;
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      applyMetaScheme(getStoredScheme() ?? "light dark");
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleToggle() {
    const system = getSystemScheme();
    const current = getStoredScheme() ?? system;
    const target: "light" | "dark" = current === "dark" ? "light" : "dark";

    try {
      if (target === system) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, target);
      }
    } catch {
      // Persistence unavailable; still update the active color scheme for this view.
    }

    applyMetaScheme(target === system ? "light dark" : target);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={
        compact
          ? "inline-flex min-h-11 items-center justify-center rounded-control px-2.5 text-ink-3 transition-colors hover:bg-raised hover:text-ink"
          : "flex min-h-9 w-full items-center gap-2.5 rounded-control px-3 text-sm text-ink-3 transition-colors hover:bg-raised hover:text-ink"
      }
    >
      <span className="theme-only-dark items-center gap-2.5">
        <Sun size={compact ? 16 : 18} strokeWidth={1.5} aria-hidden />
        <span className={compact ? "sr-only" : undefined}>Light mode</span>
      </span>
      <span className="theme-only-light items-center gap-2.5">
        <Moon size={compact ? 16 : 18} strokeWidth={1.5} aria-hidden />
        <span className={compact ? "sr-only" : undefined}>Dark mode</span>
      </span>
    </button>
  );
}
