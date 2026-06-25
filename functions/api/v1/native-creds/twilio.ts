// Per-tenant Twilio Auth Token storage.
//
// PUT    /api/v1/native-creds/twilio  — set or replace the auth token
// GET    /api/v1/native-creds/twilio  — { configured: boolean, updated_at? }
// DELETE /api/v1/native-creds/twilio  — clear the credential
//
// The plaintext auth token is never returned. The GET surface only
// reveals "is something configured?" so the dashboard can render
// "Native signature verification: ON".
//
// Auth: Authorization: Bearer <token> (API key OR Supabase JWT).

import { authenticateAnyTenant } from '../../_lib/dualAuth';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';

interface PutBody {
  auth_token?: string;
}

export const onRequestPut: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }
  const token = (body.auth_token ?? '').trim();
  if (!token) {
    return jsonError(400, 'bad_request', 'auth_token is required.');
  }

  // Upsert by (tenant_id, service). The unique index enforces one row.
  const { error } = await supabase
    .from('tenant_native_creds')
    .upsert(
      {
        tenant_id: tenant.tenant_id,
        service: 'twilio',
        credential: { auth_token: token },
      },
      { onConflict: 'tenant_id,service' },
    );

  if (error) {
    console.error('[v1/native-creds/twilio PUT] upsert failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ ok: true, configured: true });
};

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { data, error } = await supabase
    .from('tenant_native_creds')
    .select('updated_at')
    .eq('tenant_id', tenant.tenant_id)
    .eq('service', 'twilio')
    .maybeSingle();

  if (error) {
    console.error('[v1/native-creds/twilio GET] lookup failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({
    configured: !!data,
    updated_at: data?.updated_at ?? null,
  });
};

export const onRequestDelete: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { error } = await supabase
    .from('tenant_native_creds')
    .delete()
    .eq('tenant_id', tenant.tenant_id)
    .eq('service', 'twilio');

  if (error) {
    console.error('[v1/native-creds/twilio DELETE] delete failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ ok: true });
};
