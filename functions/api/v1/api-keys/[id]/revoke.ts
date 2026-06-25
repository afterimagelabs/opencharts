// Tenant-authenticated API key revocation.
//
// POST /api/v1/api-keys/:id/revoke — mark a key revoked. Idempotent.
//
// Auth: Authorization: Bearer <token> (API key OR Supabase JWT).

import { authenticateAnyTenant } from '../../../_lib/dualAuth';
import { jsonError, jsonResponse } from '../../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../../_lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, params, request }) => {
  const id = String(params.id ?? '');
  if (!UUID_RE.test(id)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  // Scope the update by tenant_id so a JWT for tenant A can't revoke
  // tenant B's keys. The update is idempotent — re-running on an
  // already-revoked row leaves the existing revoked_at intact.
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.tenant_id)
    .is('revoked_at', null)
    .select('id, prefix, revoked_at')
    .maybeSingle();

  if (error) {
    console.error('[v1/api-keys/:id/revoke] update failed', error);
    return jsonError(500, 'internal_error');
  }

  if (!data) {
    // Already-revoked or doesn't belong to this tenant; either way the
    // tenant gets a 200 ok with already_revoked:true so the dashboard
    // can render a consistent "this key is revoked" state.
    return jsonResponse({ ok: true, already_revoked: true });
  }

  return jsonResponse({ ok: true, api_key: data });
};
