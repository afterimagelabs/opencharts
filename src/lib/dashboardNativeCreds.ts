// Dashboard helpers for managing per-(tenant, service) native
// credentials (Twilio Auth Token, Mailgun signing key). The endpoint
// surface NEVER returns plaintext — the dashboard only learns whether
// a credential is configured.

import type { SupabaseClient } from '@supabase/supabase-js';

export type NativeService = 'twilio' | 'mailgun';

export interface NativeCredStatus {
  configured: boolean;
  updated_at: string | null;
}

async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}

export async function getNativeCredStatus(
  supabase: SupabaseClient,
  service: NativeService,
): Promise<{ ok: true; status: NativeCredStatus } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/native-creds/${service}`, { headers });
    const body = (await res.json().catch(() => ({}))) as {
      configured?: boolean;
      updated_at?: string | null;
      message?: string;
    };
    if (!res.ok) return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    return {
      ok: true,
      status: {
        configured: !!body.configured,
        updated_at: body.updated_at ?? null,
      },
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function setNativeCred(
  supabase: SupabaseClient,
  service: NativeService,
  value: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, message: 'Value is required.' };
  }
  const fieldName = service === 'twilio' ? 'auth_token' : 'signing_key';
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/native-creds/${service}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ [fieldName]: trimmed }),
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

export async function clearNativeCred(
  supabase: SupabaseClient,
  service: NativeService,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/native-creds/${service}`, {
      method: 'DELETE',
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
