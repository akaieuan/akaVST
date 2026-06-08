import Image from "next/image";
import type { Plugin } from "@/lib/plugins";
import { cn } from "@/lib/utils";

/**
 * Product artwork. Uses a real screenshot when the plugin has a heroImage,
 * otherwise renders an on-brand styled panel (grid + glow + wordmark).
 */
export function PluginArtwork({
  plugin,
  priority = false,
  className,
}: {
  plugin: Plugin;
  priority?: boolean;
  className?: string;
}) {
  if (plugin.heroImage) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border bg-card",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-10 brand-glow opacity-40" />
        <Image
          src={plugin.heroImage}
          alt={`${plugin.name} interface`}
          width={1600}
          height={1000}
          priority={priority}
          className="relative h-auto w-full"
          sizes="(max-width: 1024px) 100vw, 560px"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-[16/11] overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <div className="absolute inset-0 brand-glow opacity-70" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className="font-mono text-6xl font-semibold tracking-tighter text-[var(--brand)]">
          {plugin.name.replace(/^aka/i, "")}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {plugin.category}
        </span>
      </div>
    </div>
  );
}
