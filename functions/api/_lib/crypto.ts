// Token + hash helpers built on Web Crypto so they work identically
// in CF Pages Functions (the runtime target) and in Node-based tests
// (Node 20+ exposes globalThis.crypto).

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += HEX[b >> 4] + HEX[b & 0x0f];
  }
  return out;
}

/**
 * Generate a fresh API-key token. 64 hex chars (256 bits of entropy).
 * The caller stores sha256(token) and shows the raw token to the user
 * exactly once.
 */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** First 8 hex chars of a token — used as the displayable prefix. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

/** SHA-256 of an input, hex-encoded. */
export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return toHex(new Uint8Array(digest));
}

/**
 * Constant-time string equality. Both inputs must be hex strings of the
 * same length. Used when comparing hashed_secret values so a timing
 * attack can't probe for valid prefixes.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
