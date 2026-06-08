"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/button-link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "bg-background/70 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Wordmark />

        <nav className="hidden items-center gap-9 md:flex">
          {site.nav.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group inline-flex items-baseline gap-1.5 font-mono text-[11px] font-light uppercase tracking-digital text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="text-[var(--brand)]/50 transition-colors group-hover:text-[var(--brand)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex">
          <ButtonLink
            href="/#plugins"
            variant="outline"
            size="sm"
            className="rounded-full border-border/60 font-mono text-[11px] font-light uppercase tracking-digital text-muted-foreground hover:text-foreground"
          >
            browse
          </ButtonLink>
        </div>

        {/* mobile */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Wordmark />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-2 flex flex-col gap-1 px-4">
                {site.nav.map((item, i) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-baseline gap-2 rounded-lg px-3 py-2.5 font-mono text-sm font-light uppercase tracking-digital text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <span className="text-[var(--brand)]/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </Link>
                ))}
                <ButtonLink
                  href="/#plugins"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="mt-3 rounded-full font-mono text-xs font-light uppercase tracking-digital"
                >
                  browse plugins
                </ButtonLink>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* gradient hairline that fades in on scroll */}
      <div
        className={cn(
          "h-px w-full bg-gradient-to-r from-transparent via-border to-transparent transition-opacity duration-300",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
    </header>
  );
}
