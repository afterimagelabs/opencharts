// Tenant-authenticated member removal.
//
// DELETE /api/v1/tenant-users/:id — remove a tenant_users row.
//
// Auth: Authorization: Bearer <token> (API key OR Supabase JWT).
//
// The JWT path cannot remove its own row (would lock the caller out
// mid-action). The API-key path is treated as a system caller and can
// remove anyone in the tenant.

import { authenticateAnyTenant } from '../../_lib/dualAuth';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestDelete: PagesFunction<OpenChartsEnv> = async ({ env, params, request }) => {
  const id = String(params.id ?? '');
  if (!UUID_RE.test(id)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);
  const caller = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!caller) return jsonError(401, 'unauthorized');

  // Self-removal guard for the JWT path. The API-key path doesn't have
  // a "self" to worry about.
  if (caller.source === 'jwt' && caller.tenant_user_id === id) {
    return jsonError(400, 'cannot_remove_self', 'Use another tenant member to remove this user.');
  }

  // Scoped delete: tenant_id pin ensures cross-tenant removal is a
  // no-op rather than a leak.
  const { data, error } = await supabase
    .from('tenant_users')
    .delete()
    .eq('id', id)
    .eq('tenant_id', caller.tenant_id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[v1/tenant-users/:id] delete failed', error);
    return jsonError(500, 'internal_error');
  }
  if (!data) return jsonError(404, 'not_found');

  return jsonResponse({ ok: true, id: data.id });
};
