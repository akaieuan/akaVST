/**
 * Derive the site's hard facts about each plugin from the plugin repos, so the
 * two can never quietly disagree.
 *
 * Versions, formats, plugin codes and platform support are read out of each
 * submodule's CMakeLists.txt. Prose stays hand-authored in src/lib/plugins.ts;
 * only things with one correct answer are generated here.
 *
 * Output is committed. The production build reads the JSON, never the
 * submodules, so a deploy does not depend on them being checked out.
 *
 *   pnpm sync:facts
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const WEB = path.resolve(import.meta.dirname, "..");
const ROOT = path.resolve(WEB, "..");
const OUT_DIR = path.join(WEB, "src", "content", "plugins");

type PluginSource = {
  slug: string;
  dir: string;
  /** Screenshots to publish, if the repo ships any. */
  assets?: string;
};

const SOURCES: PluginSource[] = [
  { slug: "bleep", dir: "bleep", assets: "assets" },
  { slug: "enzyme", dir: "enzyme" },
  { slug: "i4", dir: "i4" },
];

export type PluginFacts = {
  slug: string;
  /** CMake project version. */
  version: string;
  /** PRODUCT_NAME: what the DAW lists it as. */
  productName: string;
  company: string;
  bundleId: string;
  pluginCode: string;
  manufacturerCode: string;
  formats: string[];
  categories: string[];
  /** Minimum macOS, from CMAKE_OSX_DEPLOYMENT_TARGET. */
  minMacOS: string;
  /** True only when the build actually sets both architectures. */
  universal: boolean;
  platform: string;
  /** The exact plugin commit these facts came from. */
  commit: string;
  /** Screenshots copied into public/plugins/<slug>/. */
  screenshots: string[];
};

/** `set(NAME "value")` or `NAME value` inside the juce_add_plugin block. */
function field(cmake: string, name: string): string | undefined {
  const quoted = cmake.match(new RegExp(`${name}\\s+"([^"]+)"`));
  if (quoted) return quoted[1];
  const bare = cmake.match(new RegExp(`^\\s*${name}\\s+([^\\s#)]+)`, "m"));
  return bare?.[1];
}

/** A whitespace-separated list terminated by end of line, e.g. FORMATS VST3 AU. */
function list(cmake: string, name: string): string[] {
  const m = cmake.match(new RegExp(`^\\s*${name}\\s+(.+)$`, "m"));
  if (!m) return [];
  return m[1]
    .replace(/#.*$/, "")
    .replace(/\)\s*$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function read(source: PluginSource): PluginFacts {
  const dir = path.join(ROOT, source.dir);
  const cmakePath = path.join(dir, "CMakeLists.txt");
  if (!fs.existsSync(cmakePath)) {
    throw new Error(
      `${source.slug}: no CMakeLists.txt at ${cmakePath}. Run: git submodule update --init ${source.dir}`,
    );
  }
  const cmake = fs.readFileSync(cmakePath, "utf8");

  const version = cmake.match(/project\([^)]*VERSION\s+([0-9][^\s)]*)/)?.[1];
  if (!version) throw new Error(`${source.slug}: could not read project VERSION`);

  const minMacOS = field(cmake, "set\\(CMAKE_OSX_DEPLOYMENT_TARGET") ?? "11.0";

  // Only claim universal when both architectures are actually set. i4 does not
  // set CMAKE_OSX_ARCHITECTURES at all, so it builds for the host arch only,
  // whatever its README says.
  const archLine = cmake.match(/CMAKE_OSX_ARCHITECTURES\s+"([^"]+)"/)?.[1] ?? "";
  const universal = archLine.includes("arm64") && archLine.includes("x86_64");

  const commit = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();

  const screenshots = source.assets
    ? publishScreenshots(source.slug, path.join(dir, source.assets))
    : [];

  return {
    slug: source.slug,
    version,
    productName: field(cmake, "PRODUCT_NAME") ?? source.slug,
    company: field(cmake, "COMPANY_NAME") ?? "akaieuan",
    bundleId: field(cmake, "BUNDLE_ID") ?? "",
    pluginCode: field(cmake, "PLUGIN_CODE") ?? "",
    manufacturerCode: field(cmake, "PLUGIN_MANUFACTURER_CODE") ?? "",
    formats: list(cmake, "FORMATS"),
    categories: list(cmake, "VST3_CATEGORIES"),
    minMacOS,
    universal,
    platform: `macOS ${minMacOS}+ · ${universal ? "Apple Silicon and Intel" : "Apple Silicon"}`,
    commit,
    screenshots,
  };
}

/** Copy any PNGs the plugin repo ships into public/, and report their URLs. */
function publishScreenshots(slug: string, assetsDir: string): string[] {
  if (!fs.existsSync(assetsDir)) return [];
  const dest = path.join(WEB, "public", "plugins", slug);
  fs.mkdirSync(dest, { recursive: true });
  const out: string[] = [];
  for (const file of fs.readdirSync(assetsDir).sort()) {
    if (!/\.(png|jpe?g)$/i.test(file)) continue;
    const from = path.join(assetsDir, file);
    const to = path.join(dest, file);
    const incoming = fs.readFileSync(from);
    // Only write on change, so a no-op sync leaves the tree untouched.
    if (!fs.existsSync(to) || !incoming.equals(fs.readFileSync(to))) {
      fs.writeFileSync(to, incoming);
    }
    out.push(`/plugins/${slug}/${file}`);
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const source of SOURCES) {
  const facts = read(source);
  const file = path.join(OUT_DIR, `${facts.slug}.generated.json`);
  const next = JSON.stringify(facts, null, 2) + "\n";
  const changed = !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== next;
  fs.writeFileSync(file, next);
  console.log(
    `${changed ? "updated" : "unchanged"}  ${facts.slug.padEnd(7)} v${facts.version.padEnd(6)} ${
      facts.universal ? "universal" : "native-only"
    }  ${facts.commit.slice(0, 7)}  ${facts.screenshots.length} screenshot(s)`,
  );
}
