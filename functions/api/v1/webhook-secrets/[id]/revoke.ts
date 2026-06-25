// Tenant-authenticated webhook secret revocation.
//
// POST /api/v1/webhook-secrets/:id/revoke — mark a secret revoked.
// Idempotent.
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

  const { data, error } = await supabase
    .from('webhook_secrets')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.tenant_id)
    .is('revoked_at', null)
    .select('id, service, prefix, revoked_at')
    .maybeSingle();

  if (error) {
    console.error('[v1/webhook-secrets/:id/revoke] update failed', error);
    return jsonError(500, 'internal_error');
  }

  if (!data) {
    return jsonResponse({ ok: true, already_revoked: true });
  }

  return jsonResponse({ ok: true, webhook_secret: data });
};
