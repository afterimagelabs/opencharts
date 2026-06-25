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

// Per-tenant webhook endpoints are stable across all of a tenant's
// requests; the hash is extracted from each provider's payload at
// receive time. Tenants set the secret in the header / `?s=` once and
// configure these URLs in each provider's webhook settings.
function webhookEndpoints(baseUrl: string) {
  return {
    humblefax_sent: `${baseUrl}/api/webhooks/humblefax`,
    humblefax_inbound: `${baseUrl}/api/webhooks/humblefax/inbound`,
    twilio: `${baseUrl}/api/webhooks/twilio`,
    mailgun_sent: `${baseUrl}/api/webhooks/mailgun`,
    mailgun_inbound: `${baseUrl}/api/webhooks/mailgun/inbound`,
    gmail: `${baseUrl}/api/webhooks/gmail`,
  };
}

// Per-request: tell the tenant exactly what to embed in each
// provider's outbound message so the inbound webhook can route the
// event back to THIS request.
function embedHashRecipes(hash: string) {
  return {
    humblefax_reference_id: `oc:${hash}`,
    twilio_custom_parameter: { name: 'oc_hash', value: hash },
    mailgun_variable: { name: 'v:oc_hash', value: hash },
    email_reply_to_token: `records+${hash}@<your_inbound_domain>`,
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
      embed_hash: embedHashRecipes(data.public_tracking_hash),
      webhook_endpoints: webhookEndpoints(baseUrl),
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
