import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex, timingSafeEqualHex, tokenPrefix } from './crypto';

export interface AuthedTenant {
  tenant_id: string;
  api_key_id: string;
}

const BEARER_RE = /^Bearer\s+([A-Za-z0-9]+)$/;

/**
 * Validate the Authorization: Bearer header against tenant_api_keys.
 * Returns the tenant + key id on success, or null on any failure.
 *
 * The lookup is keyed by the 8-char prefix and verified with constant-
 * time SHA-256 comparison so an attacker can't probe for valid prefixes
 * via response-time differences.
 */
export async function authenticateTenant(
  supabase: SupabaseClient,
  authHeader: string | null | undefined,
): Promise<AuthedTenant | null> {
  if (!authHeader) return null;
  const match = BEARER_RE.exec(authHeader);
  if (!match) return null;

  const token = match[1];
  // The current key format is 64 hex chars; reject malformed tokens
  // before we hit the DB.
  if (token.length !== 64 || !/^[0-9a-f]+$/.test(token)) return null;

  const prefix = tokenPrefix(token);
  const presentedHash = await sha256Hex(token);

  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select('id, tenant_id, hashed_secret, revoked_at')
    .eq('prefix', prefix)
    .is('revoked_at', null);

  if (error || !data || data.length === 0) return null;

  // Prefix collisions are vanishingly unlikely with 8 hex chars but
  // we still verify every candidate row.
  for (const row of data) {
    if (timingSafeEqualHex(row.hashed_secret, presentedHash)) {
      // Fire-and-forget last_used_at update; failure is non-fatal.
      void supabase
        .from('tenant_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', row.id);

      return { tenant_id: row.tenant_id, api_key_id: row.id };
    }
  }

  return null;
}
