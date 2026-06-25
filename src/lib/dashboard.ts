// Dashboard-side queries. All go through the auth'd Supabase client
// (anon key + user JWT) so RLS enforces tenant scoping.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardRequest {
  id: string;
  public_tracking_hash: string;
  provider_name: string | null;
  patient_ref: string | null;
  initial_request_at: string | null;
  records_received_at: string | null;
  records_incomplete_at: string | null;
  created_at: string;
}

const MAX_LIMIT = 200;

/**
 * Load the tenant's requests, newest first. RLS filters out anything
 * the signed-in user can't see.
 */
export async function listRequests(
  supabase: SupabaseClient,
  options: { limit?: number } = {},
): Promise<{ ok: true; requests: DashboardRequest[] } | { ok: false; message: string }> {
  const limit = options.limit ?? 50;
  const { data, error } = await supabase
    .from('requests')
    .select(
      'id, public_tracking_hash, provider_name, patient_ref, initial_request_at, records_received_at, records_incomplete_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, MAX_LIMIT));

  if (error) return { ok: false, message: error.message };
  return { ok: true, requests: (data ?? []) as DashboardRequest[] };
}

export type RequestStatus = 'awaiting_first_contact' | 'in_progress' | 'received' | 'flagged_incomplete';

/**
 * Pure derivation of the request's high-level status from its
 * timestamp fields. Kept here (not in the component) so it's testable
 * in isolation.
 */
export function deriveStatus(r: DashboardRequest): RequestStatus {
  if (r.records_incomplete_at) return 'flagged_incomplete';
  if (r.records_received_at) return 'received';
  if (r.initial_request_at) return 'in_progress';
  return 'awaiting_first_contact';
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  awaiting_first_contact: 'Not yet sent',
  in_progress: 'In progress',
  received: 'Received',
  flagged_incomplete: 'Received · flagged incomplete',
};

export function statusLabel(s: RequestStatus): string {
  return STATUS_LABEL[s];
}
