// Tenant-authenticated event logging.
//
// POST /api/v1/requests/:id/events
//
// Used by tenants who want to log a fax/email/call/etc directly from
// their own stack, rather than wiring up a webhook adapter. Same data
// shape as what the webhook adapters end up writing.
//
// Auth: Authorization: Bearer <tenant_api_key>

import { jsonError, jsonResponse } from '../../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../../_lib/supabase';
import { authenticateTenant } from '../../../_lib/tenantAuth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_TYPES = new Set([
  'fax',
  'email',
  'call',
  'records_received',
  'records_incomplete',
]);

interface CreateEventBody {
  type?: string;
  occurred_at?: string;
  external_id?: string;
  incomplete?: boolean;
  metadata?: Record<string, unknown>;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ params, env, request }) => {
  const id = String(params.id ?? '');
  if (!UUID_RE.test(id)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: CreateEventBody;
  try {
    body = (await request.json()) as CreateEventBody;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  if (typeof body.type !== 'string' || !ALLOWED_TYPES.has(body.type)) {
    return jsonError(400, 'bad_request', 'type is required and must be a known event type.');
  }
  const occurredAt = body.occurred_at ?? new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return jsonError(400, 'bad_request', 'occurred_at must be a parseable ISO timestamp.');
  }

  const { data: req, error: reqErr } = await supabase
    .from('requests')
    .select('id, tenant_id')
    .eq('id', id)
    .maybeSingle();
  if (reqErr || !req || req.tenant_id !== tenant.tenant_id) {
    return jsonError(404, 'not_found');
  }

  const row = {
    request_id: req.id,
    type: body.type,
    occurred_at: occurredAt,
    source: 'api' as const,
    external_id: body.external_id ?? null,
    incomplete: !!body.incomplete,
    metadata: body.metadata ?? {},
  };

  const { data, error } = await supabase
    .from('events')
    .insert(row)
    .select('id, type, occurred_at, incomplete, external_id, metadata, created_at')
    .single();

  if (error || !data) {
    // Unique-violation on (request_id, source, external_id) → 409.
    if (error?.code === '23505') {
      return jsonError(409, 'duplicate', 'An event with that external_id already exists.');
    }
    console.error('[v1/requests/:id/events] insert failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ event: data }, { status: 201 });
};
