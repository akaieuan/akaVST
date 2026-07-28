/**
 * Scaffolding for the brand catalogue. Deliberately the same idiom as the rest
 * of the site (the same well, the same figcaption rule, the same divider) so
 * the catalogue reads as part of the system rather than as a second site.
 *
 * Nothing here reimplements a component: every specimen renders the shipped
 * thing. No "use client" either; only the leaves that genuinely need the
 * browser cross the boundary.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoNeighbours } from "./sections";

export function DemoHeader({
  title,
  lede,
  meta,
}: {
  title: string;
  lede: ReactNode;
  meta?: string;
}) {
  return (
    <header className="pt-4 pb-14">
      <p className="label">Brand system · unlisted</p>
      <h1 className="mt-6 text-3xl font-light tracking-tight text-foreground md:text-4xl">
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lede}</p>
      {meta ? <p className="label mt-6">{meta}</p> : null}
    </header>
  );
}

/** One specimen section. `scroll-mt-20` clears the sticky nav on an anchor. */
export function DemoSection({
  id,
  title,
  description,
  meta,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 border-t border-border/60 py-12 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={`${id}-title`} className="text-xl font-light tracking-tight text-foreground">
          {title}
        </h2>
        {meta ? <span className="label shrink-0">{meta}</span> : null}
      </div>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

/** The surface a specimen sits on. */
export function Well({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl border border-border/40 bg-card/40 p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A specimen plus its caption. */
export function Specimen({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-3">
      <Well>{children}</Well>
      <figcaption>
        <p className="font-mono text-[12px] text-foreground">{label}</p>
        {note ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{note}</p>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function TileGrid({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        cols === 2 && "sm:grid-cols-2",
        cols === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  );
}

export function DemoPager({ slug }: { slug: string }) {
  const { prev, next } = demoNeighbours(slug);
  return (
    <nav className="flex items-center justify-between gap-4 border-t border-border/60 pt-8">
      {prev ? (
        <Link
          href={prev.href}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={next.href}
          className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {next.title}
          <ArrowUpRight
            aria-hidden
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
