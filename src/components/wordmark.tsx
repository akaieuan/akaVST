import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-baseline font-mono text-lg font-semibold tracking-tight",
        className,
      )}
      aria-label="akaplugins home"
    >
      <span className="text-muted-foreground transition-colors group-hover:text-foreground">
        aka
      </span>
      <span className="text-foreground">plugins</span>
      <span className="ml-1 inline-block size-1.5 translate-y-[-2px] rounded-full bg-[var(--brand)]" />
    </Link>
  );
}
