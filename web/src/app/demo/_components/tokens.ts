import fs from "node:fs/promises";
import path from "node:path";

/**
 * The token page reads globals.css itself rather than restating its values in
 * TypeScript. A palette page that keeps its own copy of the palette is a
 * palette page that will eventually be wrong, and wrong in the one way nobody
 * notices: quietly, in the documentation.
 *
 * This runs at build time, so the cost is one file read per build and nothing
 * at request time.
 */

export type TokenTable = Record<string, string>;

/** Pull the `--*` declarations out of one top-level rule. Neither nests. */
function parseBlock(css: string, selector: string): TokenTable {
  const open = css.indexOf(`${selector} {`);
  if (open === -1) return {};
  const close = css.indexOf("}", open);
  const body = css.slice(open, close === -1 ? undefined : close);
  const out: TokenTable = {};
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[`--${m[1]}`] = m[2]!.trim();
  }
  return out;
}

export async function readTokenTables(): Promise<{ light: TokenTable; dark: TokenTable }> {
  const file = path.join(process.cwd(), "src", "app", "globals.css");
  const css = await fs.readFile(file, "utf-8");
  // Comments first: the token blocks are annotated, and a block comment can
  // otherwise swallow or fake a declaration.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return { light: parseBlock(stripped, ":root"), dark: parseBlock(stripped, ".dark") };
}
