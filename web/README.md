# akaVST — the site

A living collection of the **aka** plugins: one page per instrument, in the akaSTYLE language.
Not a storefront. There is no checkout, no download, and no environment variable to set.

Next.js 16 (App Router) · React 19 · Tailwind v4 · shadcn token conventions · TypeScript.

```bash
pnpm install
pnpm dev
```

Deployed from the repo root with Vercel's **Root Directory** set to `web`.

## How it is put together

Server-first. Every page and section is a Server Component; the only client code is the theme
provider, the theme toggle, and the canvas mark.

```
src/
├── app/            layout · page · plugins · plugins/[slug] · colophon · sitemap · icon
├── components/
│   ├── site/       Nav · Footer · Hairline · Theme* · PixelRack
│   ├── home/       Hero · CollectionGrid · Thesis · shared.ts
│   └── plugin/     PluginHero · Sections
├── content/        generated plugin facts (committed, see below)
└── lib/            brand · plugins · plugin-facts · utils
```

All four routes are statically prerendered.

## Content: what is written, what is derived

Prose lives in [`src/lib/plugins.ts`](src/lib/plugins.ts) and is hand-written.

Anything with one correct answer is read out of the plugin repos instead:

```bash
pnpm sync:facts
```

That reads each submodule's `CMakeLists.txt` for version, product name, formats, plugin codes,
category and platform, copies any screenshots the repo ships into `public/plugins/<slug>/`, and
writes `src/content/plugins/<slug>.generated.json` stamped with the plugin commit it came from.

The output is committed, so the production build never reads the submodules and a deploy does not
depend on them being checked out. Run it after bumping a plugin version. It only rewrites files
that actually changed, so a no-op run leaves the tree clean.

Where a README and a build disagree, the build wins. i4's README claims a universal binary; its
CMakeLists does not set `CMAKE_OSX_ARCHITECTURES`, so the site says Apple Silicon.

## The mark

[`PixelRack`](src/components/site/PixelRack.tsx) is one canvas component in four modes. It follows
the akaOSS `PixelHead` grammar: deterministic hash PRNG, one sampled cell set, an assemble-and-hold
timeline, colour resolved from `--foreground` and repainted on theme change, the loop gated on an
IntersectionObserver plus `visibilitychange`, and a single still frame under `prefers-reduced-motion`.

Device geometry is laid out in whole cells rather than normalized space, so blocks stay crisp at
every size the component is used at. Each mode's idle motion is what the plugin does: a sequencer
playhead (`step`), four bars shearing (`layers`), a window travelling along a waveform (`grain`),
and the panel held still for chrome (`rack`). See [`/colophon`](src/app/colophon/page.tsx).

## Checks

```bash
pnpm verify   # typecheck + lint + build
```
