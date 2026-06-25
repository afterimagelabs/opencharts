// Tenant-authenticated webhook secret management.
//
// POST /api/v1/webhook-secrets        — mint a secret for a service.
//                                       Revokes any previously-active
//                                       secret for the same service.
// GET  /api/v1/webhook-secrets        — list secrets (prefixes only).
//
// Auth: Authorization: Bearer <tenant_api_key>

import { generateToken, sha256Hex, tokenPrefix } from '../_lib/crypto';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateTenant } from '../_lib/tenantAuth';

const ALLOWED_SERVICES = new Set(['gmail', 'humblefax', 'twilio', 'mailgun']);

interface CreateBody {
  service?: string;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: CreateBody = {};
  try {
    const raw = await request.text();
    body = raw ? (JSON.parse(raw) as CreateBody) : {};
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }
  const service = body.service;
  if (typeof service !== 'string' || !ALLOWED_SERVICES.has(service)) {
    return jsonError(400, 'bad_request', 'service must be one of gmail|humblefax|twilio|mailgun.');
  }

  // Revoke the existing active secret (the partial unique index would
  // otherwise reject the insert). Tenants should treat key rotation as
  // a deliberate step — one outstanding secret per (tenant, service).
  const { error: revokeErr } = await supabase
    .from('webhook_secrets')
    .update({ revoked_at: new Date().toISOString() })
    .eq('tenant_id', tenant.tenant_id)
    .eq('service', service)
    .is('revoked_at', null);
  if (revokeErr) {
    console.error('[v1/webhook-secrets] revoke failed', revokeErr);
    return jsonError(500, 'internal_error');
  }

  const token = generateToken();
  const prefix = tokenPrefix(token);
  const hashed = await sha256Hex(token);

  const { data, error } = await supabase
    .from('webhook_secrets')
    .insert({
      tenant_id: tenant.tenant_id,
      service,
      prefix,
      hashed_secret: hashed,
    })
    .select('id, service, prefix, created_at')
    .single();

  if (error || !data) {
    console.error('[v1/webhook-secrets] insert failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse(
    {
      id: data.id,
      service: data.service,
      prefix: data.prefix,
      created_at: data.created_at,
      secret: token,
    },
    { status: 201 },
  );
};

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { data, error } = await supabase
    .from('webhook_secrets')
    .select('id, service, prefix, created_at, revoked_at')
    .eq('tenant_id', tenant.tenant_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[v1/webhook-secrets] list failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ webhook_secrets: data ?? [] });
};
