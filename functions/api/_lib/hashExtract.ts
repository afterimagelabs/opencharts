// Helpers for extracting a public_tracking_hash from the various
// shapes a provider payload can arrive in. Tenants embed the hash in
// outbound traffic; we read it back here.

// Same validation regex used everywhere else.
const HASH_BODY = '[A-Za-z0-9_-]{16,32}';

const EMAIL_PLUS_HASH = new RegExp(`records\\+(${HASH_BODY})@`, 'i');
const OC_PREFIX = new RegExp(`oc:(${HASH_BODY})`);
const BARE_HASH = new RegExp(`^${HASH_BODY}$`);

/**
 * Look for `records+<hash>@anything` in an email-address-shaped string.
 * Returns the hash or null. Case-insensitive on the literal `records+`.
 */
export function extractHashFromEmailAddress(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = EMAIL_PLUS_HASH.exec(input);
  return m ? m[1] : null;
}

/**
 * Search a list of email addresses (To/CC/Reply-To) for the first one
 * that contains `records+<hash>@`.
 */
export function extractHashFromAddressList(
  addresses: ReadonlyArray<string | null | undefined>,
): string | null {
  for (const a of addresses) {
    const h = extractHashFromEmailAddress(a);
    if (h) return h;
  }
  return null;
}

/**
 * Pull a hash out of an `oc:<hash>` token embedded in a free-text
 * field — what we ask tenants to put in HumbleFax's referenceId or
 * a fax cover sheet.
 */
export function extractHashFromOcToken(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = OC_PREFIX.exec(input);
  return m ? m[1] : null;
}

/** Validate a string IS already a bare hash. */
export function isValidHash(input: string | null | undefined): input is string {
  if (!input) return false;
  return BARE_HASH.test(input);
}
