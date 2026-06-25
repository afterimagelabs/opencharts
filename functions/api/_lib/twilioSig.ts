// Twilio request-signature verification.
//
// Twilio sends X-Twilio-Signature: <base64> on every webhook. The
// signature is HMAC-SHA1(authToken, signedString) where signedString
// is:
//
//   * The full webhook URL (incl. query string), then
//   * For application/x-www-form-urlencoded bodies, the params sorted
//     alphabetically by name and concatenated as
//     name1value1name2value2…
//   * For JSON bodies, the raw body bytes appended after the URL
//
// References:
//   https://www.twilio.com/docs/usage/webhooks/webhooks-security
//   https://github.com/twilio/twilio-node/blob/master/src/webhooks/webhooks.ts

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  // CF Workers / browsers expose btoa; Node tests in Vitest also.
  return btoa(s);
}

/** Constant-time string equality. Inputs must be the same length. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Compute the signed-string Twilio uses for form-encoded webhooks:
 * URL + concatenated sorted-by-name name+value pairs.
 */
export function buildFormSignedString(url: string, params: Record<string, string>): string {
  const names = Object.keys(params).sort();
  let out = url;
  for (const name of names) out += name + params[name];
  return out;
}

/**
 * Compute Twilio's expected signature for a form-encoded webhook.
 * Returns the base64-encoded HMAC-SHA1 digest.
 */
export async function computeFormSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): Promise<string> {
  const signedString = buildFormSignedString(url, params);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedString));
  return bytesToBase64(new Uint8Array(sig));
}

/**
 * Verify a presented X-Twilio-Signature against the expected one.
 */
export async function verifyTwilioFormSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  presentedSignature: string | null | undefined,
): Promise<boolean> {
  if (!presentedSignature) return false;
  const expected = await computeFormSignature(authToken, url, params);
  return timingSafeEqual(expected, presentedSignature);
}
