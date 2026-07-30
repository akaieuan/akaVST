import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Hairline } from "@/components/site/Hairline";
import { PixelRack } from "@/components/site/rack";
import { ACCENT_COLORS } from "@/lib/plugins";
import { SOCKET } from "@/lib/socket";
import { arrowNudge, cardSurface } from "@/components/home/shared";

/**
 * Socket, directly under how the instruments get made.
 *
 * That is the right place for it: the section above explains that each of these
 * was assembled by hand, and this is the answer to doing it again. Anywhere
 * higher and it competes with the three things that actually exist; anywhere
 * lower and it reads as a footnote.
 *
 * One card rather than a grid, because there is one of it, and a grid of one is
 * a grid that lost something.
 */
export function SocketTeaser() {
  return (
    <section className="py-16">
      <Hairline className="mb-16" />

      <div className="flex items-baseline justify-between gap-4">
        <span className="label block">Next</span>
        <span className="label shrink-0">Coming soon</span>
      </div>

      <Link
        href="/socket"
        className={cn(cardSurface, "mt-8 grid grid-cols-1 gap-8 p-7 sm:grid-cols-[1fr_auto] sm:items-center")}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: ACCENT_COLORS[SOCKET.accent] }}
            />
            <h3 className="text-xl font-light tracking-tight text-foreground">{SOCKET.name}</h3>
            <span className="label ml-1 hidden sm:inline">{SOCKET.kind}</span>
            <ArrowUpRight
              aria-hidden
              className={cn(arrowNudge, "ml-auto text-muted-foreground group-hover:text-foreground sm:hidden")}
            />
          </div>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-foreground/80">
            {SOCKET.oneLiner} Drag blocks onto a plugin window, wire the signal path, patch
            modulation with cables — and hear it, because the engine underneath is the same C++ the
            three instruments run on.
          </p>

          <p className="mt-4 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {SOCKET.status}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-5 sm:flex">
          <PixelRack size={128} ratio={0.62} grid={22} mode={SOCKET.mark} accent={SOCKET.accent} once />
          <ArrowUpRight
            aria-hidden
            className={cn(arrowNudge, "text-muted-foreground group-hover:text-foreground")}
          />
        </div>
      </Link>
    </section>
  );
}
