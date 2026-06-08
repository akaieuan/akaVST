import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center font-mono text-[15px] font-light tracking-tight",
        className,
      )}
      aria-label="akaplugins home"
    >
      <span className="text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
        aka
      </span>
      <span className="text-foreground">plugins</span>
      <span
        aria-hidden
        className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[1px] bg-gradient-to-b from-[var(--brand)] to-[var(--brand)]/30 motion-safe:animate-pulse"
      />
    </Link>
  );
}
