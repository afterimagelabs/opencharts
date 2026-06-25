// Dashboard team / membership management.

import type { SupabaseClient } from '@supabase/supabase-js';

export type TenantUserRole = 'admin' | 'ops' | 'viewer';
export type TenantUserStatus = 'active' | 'pending';

export interface TenantUserRow {
  id: string;
  email: string;
  role: TenantUserRole;
  created_at: string;
  user_id: string | null;
}

export interface TenantUserView extends TenantUserRow {
  status: TenantUserStatus;
}

async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}

export function deriveStatus(r: TenantUserRow): TenantUserStatus {
  return r.user_id ? 'active' : 'pending';
}

export async function listTenantUsers(
  supabase: SupabaseClient,
): Promise<{ ok: true; members: TenantUserView[] } | { ok: false; message: string }> {
  // Direct read via RLS; tenant_users_member_read scopes to the user's
  // tenant.
  const { data, error } = await supabase
    .from('tenant_users')
    .select('id, email, role, created_at, user_id')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, message: error.message };
  const rows = (data ?? []) as TenantUserRow[];
  return {
    ok: true,
    members: rows.map((r) => ({ ...r, status: deriveStatus(r) })),
  };
}

export async function inviteTenantUser(
  supabase: SupabaseClient,
  email: string,
  role: TenantUserRole,
): Promise<{ ok: true; member: TenantUserRow } | { ok: false; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { ok: false, message: 'Email is required.' };
  try {
    const headers = await authHeader(supabase);
    const res = await fetch('/api/v1/tenant-users', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: cleanEmail, role }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      tenant_user?: TenantUserRow;
      message?: string;
    };
    if (!res.ok) return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    if (!body.tenant_user) return { ok: false, message: 'Unexpected response shape.' };
    return { ok: true, member: body.tenant_user };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function removeTenantUser(
  supabase: SupabaseClient,
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/tenant-users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      return { ok: false, message: body.message ?? body.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
