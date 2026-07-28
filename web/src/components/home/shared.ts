/* Shared presentation constants for the landing sections. Server-only: plain
   class strings, no client runtime. */

/* Entrance: a light reveal with a 120ms top-to-bottom stagger, motion-safe only. */
export const reveal =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-backwards motion-safe:duration-700";
export const stagger = (step: number) => ({ animationDelay: `${step * 120}ms` });

export const primaryCta =
  "group inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground/15 px-6 text-sm font-medium text-foreground transition-colors hover:bg-foreground/25";
export const arrowLink =
  "text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-sm transition-colors";
export const arrowNudge =
  "size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5";

/** The card idiom: hairline border, translucent fill, a 1px lift on hover. */
export const cardSurface =
  "group rounded-2xl border border-border/40 bg-card/40 transition-all duration-200 hover:-translate-y-0.5 hover:bg-card";
