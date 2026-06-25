// Per-tenant Mailgun signing-key storage.
//
// PUT    /api/v1/native-creds/mailgun  — set or replace the signing key
// GET    /api/v1/native-creds/mailgun  — { configured: boolean, updated_at? }
// DELETE /api/v1/native-creds/mailgun  — clear the credential
//
// Same shape as the Twilio credentials endpoint. The plaintext key is
// never returned.
//
// Auth: Authorization: Bearer <token> (API key OR Supabase JWT).

import { authenticateAnyTenant } from '../../_lib/dualAuth';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';

interface PutBody {
  signing_key?: string;
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
  const key = (body.signing_key ?? '').trim();
  if (!key) {
    return jsonError(400, 'bad_request', 'signing_key is required.');
  }

  const { error } = await supabase
    .from('tenant_native_creds')
    .upsert(
      {
        tenant_id: tenant.tenant_id,
        service: 'mailgun',
        credential: { signing_key: key },
      },
      { onConflict: 'tenant_id,service' },
    );

  if (error) {
    console.error('[v1/native-creds/mailgun PUT] upsert failed', error);
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
    .eq('service', 'mailgun')
    .maybeSingle();

  if (error) {
    console.error('[v1/native-creds/mailgun GET] lookup failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ configured: !!data, updated_at: data?.updated_at ?? null });
};

export const onRequestDelete: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateAnyTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  const { error } = await supabase
    .from('tenant_native_creds')
    .delete()
    .eq('tenant_id', tenant.tenant_id)
    .eq('service', 'mailgun');

  if (error) {
    console.error('[v1/native-creds/mailgun DELETE] delete failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ ok: true });
};
