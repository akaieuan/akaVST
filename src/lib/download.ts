import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Time-limited, tamper-proof download tokens.
 *
 * A token encodes the plugin slug + an expiry, signed with DOWNLOAD_SECRET.
 * After a successful purchase we mint one and hand it to the buyer; the
 * /api/download/[token] route verifies it before issuing a signed R2 URL.
 *
 * Stateless by design — no database needed for download-only delivery.
 */

type TokenPayload = { slug: string; exp: number };

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function sign(data: string): string {
  return b64url(createHmac("sha256", env.downloadSecret).update(data).digest());
}

/** Create a download token valid for `ttlSeconds` (default 24h). */
export function createDownloadToken(slug: string, ttlSeconds = 60 * 60 * 24): string {
  const payload: TokenPayload = {
    slug,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a token; returns the slug if valid and unexpired, else null. */
export function verifyDownloadToken(token: string): string | null {
  if (!env.downloadSecret) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = fromB64url(sig);
  const b = fromB64url(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString()) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.slug;
  } catch {
    return null;
  }
}
