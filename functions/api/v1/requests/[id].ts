// Tenant-authenticated request detail.
//
// GET /api/v1/requests/:id
//
// Auth: Authorization: Bearer <tenant_api_key>

import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';
import { authenticateTenant } from '../../_lib/tenantAuth';
import { buildTimelineForHash } from '../../_lib/timeline';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ params, env, request }) => {
  const id = String(params.id ?? '');
  if (!UUID_RE.test(id)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { data: row, error } = await supabase
    .from('requests')
    .select('id, tenant_id, public_tracking_hash')
    .eq('id', id)
    .maybeSingle();

  // Treat a tenant mismatch as 404 — leaking the existence of another
  // tenant's request via a 403 would be a small but real info leak.
  if (error || !row || row.tenant_id !== tenant.tenant_id) {
    return jsonError(404, 'not_found');
  }

  try {
    const timeline = await buildTimelineForHash(supabase, row.public_tracking_hash);
    if (!timeline) return jsonError(404, 'not_found');
    return jsonResponse({ id: row.id, ...timeline });
  } catch (err) {
    console.error('[v1/requests/:id] timeline failed', err);
    return jsonError(500, 'internal_error');
  }
};
