import bleep from "@/content/plugins/bleep.generated.json";
import enzyme from "@/content/plugins/enzyme.generated.json";
import i4 from "@/content/plugins/i4.generated.json";
import { PLUGINS, type Plugin, type PluginSlug } from "@/lib/plugins";

/**
 * Facts derived from each plugin's CMakeLists by `pnpm sync:facts`. Imported
 * statically so they are bundled at build time: nothing here reads the
 * submodules, or the filesystem, at request time.
 */
export type PluginFacts = {
  slug: string;
  version: string;
  productName: string;
  company: string;
  bundleId: string;
  pluginCode: string;
  manufacturerCode: string;
  formats: string[];
  categories: string[];
  minMacOS: string;
  universal: boolean;
  platform: string;
  commit: string;
  screenshots: string[];
};

const FACTS: Record<PluginSlug, PluginFacts> = {
  bleep,
  enzyme,
  i4,
};

/** A plugin and the generated facts about the exact commit it ships from. */
export type PluginEntry = Plugin & { facts: PluginFacts };

export const PLUGIN_ENTRIES: PluginEntry[] = PLUGINS.map((plugin) => ({
  ...plugin,
  facts: FACTS[plugin.slug],
}));

export function getPluginEntry(slug: string): PluginEntry | undefined {
  return PLUGIN_ENTRIES.find((p) => p.slug === slug);
}

/** The one-line status shown under a plugin's name. */
export function statusLine(entry: PluginEntry): string {
  const { facts } = entry;
  return [
    `v${facts.version}`,
    facts.formats.join(" · "),
    facts.platform,
    `${entry.presets?.count ?? 0} presets`,
  ].join(" · ");
}
