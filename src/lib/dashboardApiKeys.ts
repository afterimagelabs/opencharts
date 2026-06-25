// Dashboard API key management.
//
// Reads go directly to Supabase (RLS-scoped) since they only need
// list access. Mints + revokes go through the tenant API endpoints
// because the SHA-256 hashing and one-time-plaintext flow have to
// happen server-side.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ApiKeyRow {
  id: string;
  prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface MintedApiKey {
  id: string;
  prefix: string;
  name: string;
  created_at: string;
  // Plaintext secret — surfaced exactly once.
  secret: string;
}

async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}

export async function listApiKeys(
  supabase: SupabaseClient,
): Promise<{ ok: true; api_keys: ApiKeyRow[] } | { ok: false; message: string }> {
  // Direct read via RLS; the tenant_api_keys_member_read policy
  // scopes this to the user's tenant.
  const { data, error } = await supabase
    .from('tenant_api_keys')
    .select('id, prefix, name, created_at, last_used_at, revoked_at')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, message: error.message };
  return { ok: true, api_keys: (data ?? []) as ApiKeyRow[] };
}

export async function mintApiKey(
  supabase: SupabaseClient,
  name: string,
): Promise<{ ok: true; api_key: MintedApiKey } | { ok: false; message: string }> {
  const cleanName = name.trim();
  if (!cleanName) return { ok: false, message: 'Name is required.' };
  try {
    const headers = await authHeader(supabase);
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: cleanName }),
    });
    const body = (await res.json().catch(() => ({}))) as { secret?: string; message?: string };
    if (!res.ok) {
      return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, api_key: body as MintedApiKey };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function revokeApiKey(
  supabase: SupabaseClient,
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/api-keys/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
