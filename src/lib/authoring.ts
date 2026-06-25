// Helpers the AuthoringPanel uses to talk to Supabase. Pure functions
// over a SupabaseClient so they can be unit-tested with a stubbed
// client.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MembershipResult {
  tenant_user_id: string;
  tenant_id: string;
}

/**
 * After the user signs in via magic link, attach the auth.users row to
 * any pending tenant_users invite that matches their email. Returns
 * the count of rows updated. Safe to call on every page load.
 */
export async function claimMembership(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc('claim_tenant_membership');
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[opencharts] claim_tenant_membership failed', error);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}

/**
 * Look up the signed-in user's tenant_user row. Returns null if they
 * don't belong to any tenant (i.e. RLS filtered everything out).
 *
 * If a user belongs to multiple tenants we return the first match
 * here — in v1 that case is unusual.
 */
export async function loadMembership(supabase: SupabaseClient): Promise<MembershipResult | null> {
  const { data, error } = await supabase
    .from('tenant_users')
    .select('id, tenant_id')
    .limit(1);

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[opencharts] tenant_users lookup failed', error);
    return null;
  }
  if (!data || data.length === 0) return null;
  return { tenant_user_id: data[0].id, tenant_id: data[0].tenant_id };
}

/**
 * Check whether the signed-in user can author on this request. We
 * just query `requests` by hash — RLS will return zero rows if the
 * user's tenant doesn't own the request.
 */
export async function canAuthorOnRequest(
  supabase: SupabaseClient,
  hash: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('requests')
    .select('id')
    .eq('public_tracking_hash', hash)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function addNote(
  supabase: SupabaseClient,
  requestId: string,
  tenantUserId: string,
  content: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, message: 'Note content cannot be empty.' };

  const { data, error } = await supabase
    .from('notes')
    .insert({
      request_id: requestId,
      content: trimmed,
      source: 'ui',
      created_by: tenantUserId,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? 'Insert failed.' };
  }
  return { ok: true, id: data.id };
}

export async function setEventIncomplete(
  supabase: SupabaseClient,
  eventId: string,
  incomplete: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from('events').update({ incomplete }).eq('id', eventId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
