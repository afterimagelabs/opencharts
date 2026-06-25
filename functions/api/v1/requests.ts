// Tenant-authenticated request management.
//
// POST /api/v1/requests       — create a new records request
// GET  /api/v1/requests       — list this tenant's requests (newest first)
//
// Auth: Authorization: Bearer <tenant_api_key>

import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateTenant } from '../_lib/tenantAuth';

interface CreateRequestBody {
  provider_name?: string;
  provider_org?: string;
  provider_phone?: string;
  provider_fax?: string;
  provider_email?: string;
  patient_ref?: string;
  metadata?: Record<string, unknown>;
}

const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_LIMIT = 25;

function webhookUrls(baseUrl: string, hash: string) {
  return {
    gmail: `${baseUrl}/api/webhooks/gmail?hash=${hash}`,
    humblefax: `${baseUrl}/api/webhooks/humblefax?hash=${hash}`,
    humblefax_inbound: `${baseUrl}/api/webhooks/humblefax/inbound?hash=${hash}`,
    twilio: `${baseUrl}/api/webhooks/twilio?hash=${hash}`,
    mailgun: `${baseUrl}/api/webhooks/mailgun?hash=${hash}`,
  };
}

function resolveBaseUrl(env: OpenChartsEnv, request: Request): string {
  if (env.PUBLIC_BASE_URL) return env.PUBLIC_BASE_URL.replace(/\/$/, '');
  return new URL(request.url).origin;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: CreateRequestBody;
  try {
    body = (await request.json()) as CreateRequestBody;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }
  if (typeof body !== 'object' || body === null) {
    return jsonError(400, 'bad_request', 'Body must be a JSON object.');
  }

  const row = {
    tenant_id: tenant.tenant_id,
    provider_name: body.provider_name ?? null,
    provider_org: body.provider_org ?? null,
    provider_phone: body.provider_phone ?? null,
    provider_fax: body.provider_fax ?? null,
    provider_email: body.provider_email ?? null,
    patient_ref: body.patient_ref ?? null,
    metadata: body.metadata ?? {},
  };

  const { data, error } = await supabase
    .from('requests')
    .insert(row)
    .select('id, public_tracking_hash, provider_name, patient_ref, created_at')
    .single();

  if (error || !data) {
    console.error('[v1/requests] insert failed', error);
    return jsonError(500, 'internal_error');
  }

  const baseUrl = resolveBaseUrl(env, request);
  return jsonResponse(
    {
      id: data.id,
      hash: data.public_tracking_hash,
      provider_name: data.provider_name,
      patient_ref: data.patient_ref,
      created_at: data.created_at,
      public_url: `${baseUrl}/request/${data.public_tracking_hash}`,
      webhook_urls: webhookUrls(baseUrl, data.public_tracking_hash),
    },
    { status: 201 },
  );
};

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIST_LIMIT)
      : DEFAULT_LIST_LIMIT;

  const { data, error } = await supabase
    .from('requests')
    .select(
      'id, public_tracking_hash, provider_name, patient_ref, initial_request_at, records_received_at, created_at',
    )
    .eq('tenant_id', tenant.tenant_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[v1/requests] list failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ requests: data ?? [] });
};
