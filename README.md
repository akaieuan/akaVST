# akaVST — storefront

The storefront for the **aka** plugin collection — akaBleep, akaEnzyme, and i4.
Next.js (App Router) · Tailwind v4 · shadcn/ui · Stripe · Cloudflare R2.

This repo is **standalone**. It does not contain or depend on the plugin source
code. The plugin projects (`akaBleep-VST`, `akaEnzyme-VST`, `akaI4-VST`) stay in
their own repos. The only things the store needs from them are:

1. **One packaged installer per plugin** (a zipped `.vst3`/`.component` or a `.dmg`),
   uploaded to a private Cloudflare R2 bucket.
2. **Product metadata** — which lives here in [`src/lib/plugins.ts`](src/lib/plugins.ts).

## How a sale works (download-only)

```
Buyer clicks Buy
  → POST /api/checkout          creates a Stripe Checkout Session
  → Stripe hosted checkout       (Stripe Tax handles VAT/sales tax)
  → /success?session_id=...      verifies payment, mints a signed 24h token
  → /api/download/[token]        verifies token → 302 to a 5-min presigned R2 URL
```

No accounts, no license keys, no database. Tokens are stateless HMACs.

## Getting it running

```bash
pnpm install
cp .env.example .env.local   # fill in when ready (site runs without it)
pnpm dev
```

Open http://localhost:3000. With no env vars, the site renders fully and Buy
buttons show **"coming soon"** (no `priceId` set).

## Going live — the checklist

1. **Stripe**: create a Product + Price per plugin → paste each Price ID into the
   `priceId` field in `src/lib/plugins.ts`. Add `STRIPE_SECRET_KEY` to env.
   Enable **Stripe Tax** in the dashboard. Add a webhook → `/api/stripe/webhook`
   and set `STRIPE_WEBHOOK_SECRET`.
2. **R2**: create a private bucket, upload one installer per plugin, and set the
   object keys in `plugins.ts` (`downloadKey`). Add the four `R2_*` env vars.
3. **DOWNLOAD_SECRET**: `openssl rand -hex 32`.
4. **Screenshots**: drop real UI shots in `public/plugins/<slug>/` and wire them
   into the card/hero (currently placeholder artwork).
5. **Copy**: replace placeholder taglines/descriptions/about/FAQ/legal text.
6. Deploy (Vercel). Set the same env vars there + `NEXT_PUBLIC_SITE_URL`.

## Adding a 4th plugin

Add one entry to `PLUGINS` in `src/lib/plugins.ts`. The card, product page,
footer link, and routing all generate from it.

## The release pipeline (optional, later)

Each plugin repo can cut a tagged GitHub Release via CI that builds, signs,
notarizes, and uploads the installer to R2. The store reads the version for
display; GitHub Releases is the changelog / version source of truth. None of
this is required to launch — you can upload installers to R2 by hand.
