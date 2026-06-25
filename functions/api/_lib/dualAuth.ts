// Tenant-API auth that accepts EITHER an API-key Bearer token OR a
// Supabase JWT (issued to a signed-in dashboard user). The endpoints
// don't care which path the caller used; they just need a tenant_id.

import type { SupabaseClient } from '@supabase/supabase-js';
import { authenticateTenant, type AuthedTenant } from './tenantAuth';

const BEARER_RE = /^Bearer\s+(.+)$/;
// API key format: 64 lowercase hex chars (see crypto.ts/generateToken).
const API_KEY_RE = /^[0-9a-f]{64}$/;

export type AuthedCaller =
  | (AuthedTenant & { source: 'api_key' })
  | { source: 'jwt'; tenant_id: string; tenant_user_id: string };

/**
 * Dispatch by token shape:
 *   - 64 hex chars  → API-key path (existing behavior)
 *   - anything else → JWT path (Supabase access_token)
 *
 * Returns null when neither path validates. The caller's source is
 * surfaced on the return value so endpoints can apply role policy
 * later (e.g. "only dashboard users can mint API keys") without
 * re-parsing the header.
 */
export async function authenticateAnyTenant(
  supabase: SupabaseClient,
  authHeader: string | null | undefined,
): Promise<AuthedCaller | null> {
  if (!authHeader) return null;
  const m = BEARER_RE.exec(authHeader);
  if (!m) return null;
  const token = m[1].trim();

  if (API_KEY_RE.test(token)) {
    const r = await authenticateTenant(supabase, authHeader);
    return r ? { ...r, source: 'api_key' } : null;
  }

  // JWT path. Validate by asking Supabase to resolve the user, then
  // look up tenant_users for them.
  let userId: string | null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    userId = data.user.id;
  } catch {
    return null;
  }

  const { data: rows, error: lookupErr } = await supabase
    .from('tenant_users')
    .select('id, tenant_id')
    .eq('user_id', userId)
    .limit(1);

  if (lookupErr || !rows || rows.length === 0) return null;
  return { source: 'jwt', tenant_id: rows[0].tenant_id, tenant_user_id: rows[0].id };
}
