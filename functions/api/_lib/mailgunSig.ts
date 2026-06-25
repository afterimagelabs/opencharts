// Mailgun webhook-signature verification.
//
// Mailgun sends a `signature` block on every webhook:
//   {
//     token:     <random string>,
//     timestamp: <unix seconds>,
//     signature: <hex HMAC-SHA256(signingKey, timestamp + token)>
//   }
//
// For their newer "event" webhooks, this block lives at body.signature.
// For inbound routes, the same triple arrives as separate form fields
// (token, timestamp, signature).
//
// We replay the HMAC and compare. Additionally we reject events with
// a stale timestamp (>5 minutes off the current clock) to make
// replay attacks impractical.
//
// References:
//   https://documentation.mailgun.com/en/latest/user_manual.html#webhooks

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += HEX[b >> 4] + HEX[b & 0x0f];
  return out;
}

/**
 * HMAC-SHA256 of `timestamp + token` using `signingKey`, hex-encoded.
 */
export async function computeMailgunSignature(
  signingKey: string,
  timestamp: string,
  token: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(timestamp + token),
  );
  return toHex(new Uint8Array(sig));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const FRESHNESS_WINDOW_SECONDS = 5 * 60; // 5 minutes

export interface MailgunSignatureInput {
  timestamp?: string | number | null;
  token?: string | null;
  signature?: string | null;
}

/**
 * Verify a Mailgun signature block. Returns a discriminated result
 * so callers can distinguish "missing fields" from "stale timestamp"
 * from "bad signature" for logging — but to the wire we collapse all
 * of these to 401.
 */
export type MailgunVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_fields' | 'stale_timestamp' | 'bad_signature' };

export async function verifyMailgunSignature(
  signingKey: string,
  input: MailgunSignatureInput,
  now: number = Math.floor(Date.now() / 1000),
): Promise<MailgunVerifyResult> {
  const timestampRaw = input.timestamp;
  const token = input.token;
  const signature = input.signature;
  if (!timestampRaw || !token || !signature) {
    return { ok: false, reason: 'missing_fields' };
  }
  const timestamp = String(timestampRaw);
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'missing_fields' };
  if (Math.abs(now - ts) > FRESHNESS_WINDOW_SECONDS) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  const expected = await computeMailgunSignature(signingKey, timestamp, token);
  return timingSafeEqualHex(expected, signature)
    ? { ok: true }
    : { ok: false, reason: 'bad_signature' };
}
