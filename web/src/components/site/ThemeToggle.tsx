"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Theme flip. Both icons ship and CSS picks one, rather than a mounted flag
 * picking it in JS: no hydration mismatch, no first-paint flash, and no
 * reflow in the nav row when the resolved theme arrives (akaSTYLE rule 06).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Switch theme"
      title="Switch theme (d)"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
    >
      <Sun aria-hidden className="hidden size-3.5 dark:block" />
      <Moon aria-hidden className="size-3.5 dark:hidden" />
    </button>
  );
}
