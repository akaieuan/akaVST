/**
 * Centralised env access. Nothing here throws at import time so the site
 * still builds and renders before you've filled in real credentials.
 * Each route checks `isConfigured` and degrades gracefully if not.
 */

export const env = {
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  // Cloudflare R2 (S3-compatible)
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",

  // secret used to sign time-limited download tokens
  downloadSecret: process.env.DOWNLOAD_SECRET ?? "",
};

export const stripeConfigured = Boolean(env.stripeSecretKey);
export const r2Configured = Boolean(
  env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2Bucket,
);
