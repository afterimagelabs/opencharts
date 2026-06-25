// Tenant-authenticated API key management.
//
// POST /api/v1/api-keys     — mint a new key, returns the plaintext once
// GET  /api/v1/api-keys     — list keys (prefix + metadata, never the secret)
//
// Auth: Authorization: Bearer <tenant_api_key> (any active key for the
// tenant can mint a new key — there's no separate "admin" tier yet).

import { generateToken, sha256Hex, tokenPrefix } from '../_lib/crypto';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateTenant } from '../_lib/tenantAuth';

interface CreateKeyBody {
  name?: string;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const tenant = await authenticateTenant(supabase, request.headers.get('Authorization'));
  if (!tenant) return jsonError(401, 'unauthorized');

  let body: CreateKeyBody = {};
  try {
    const raw = await request.text();
    body = raw ? (JSON.parse(raw) as CreateKeyBody) : {};
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }
  const name = (body.name ?? 'Untitled key').trim();
  if (!name) {
    return jsonError(400, 'bad_request', 'name must not be empty.');
  }

  const token = generateToken();
  const prefix = tokenPrefix(token);
  const hashed = await sha256Hex(token);

  const { data, error } = await supabase
    .from('tenant_api_keys')
    .insert({
      tenant_id: tenant.tenant_id,
      prefix,
      hashed_secret: hashed,
      name,
    })
    .select('id, prefix, name, created_at')
    .single();

  if (error || !data) {
    console.error('[v1/api-keys] insert failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse(
    {
      id: data.id,
      prefix: data.prefix,
      name: data.name,
      created_at: data.created_at,
      // Surfaced exactly once. Tenant must store it server-side.
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
    .from('tenant_api_keys')
    .select('id, prefix, name, created_at, last_used_at, revoked_at')
    .eq('tenant_id', tenant.tenant_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[v1/api-keys] list failed', error);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({ api_keys: data ?? [] });
};
