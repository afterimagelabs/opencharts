import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidHash } from './hashExtract';

export type EventType =
  | 'fax'
  | 'email'
  | 'call'
  | 'records_received'
  | 'records_incomplete'
  | 'note_added';

export type EventSource =
  | 'webhook:gmail'
  | 'webhook:humblefax'
  | 'webhook:humblefax_inbound'
  | 'webhook:twilio'
  | 'webhook:mailgun'
  | 'api'
  | 'ui';

export interface InsertEventInput {
  tenant_id: string;
  hash: string;
  type: EventType;
  source: EventSource;
  occurred_at: string;
  external_id?: string | null;
  incomplete?: boolean;
  metadata?: Record<string, unknown>;
}

export type InsertEventResult =
  | { ok: true; event_id: string; request_id: string; deduped: false }
  | { ok: true; event_id: null; request_id: string; deduped: true }
  | { ok: false; reason: 'invalid_hash' | 'unknown_request' | 'tenant_mismatch' | 'db_error'; detail?: string };

/**
 * Resolve a hash to a request (within the scoped tenant) and insert an
 * event. Dedupes on (request_id, source, external_id) — if a row with
 * that triple already exists, returns ok:true with deduped:true so the
 * caller can return 200 to the provider and stop the retry loop.
 */
export async function insertWebhookEvent(
  supabase: SupabaseClient,
  input: InsertEventInput,
): Promise<InsertEventResult> {
  if (!isValidHash(input.hash)) {
    return { ok: false, reason: 'invalid_hash' };
  }

  const { data: request, error: reqErr } = await supabase
    .from('requests')
    .select('id, tenant_id')
    .eq('public_tracking_hash', input.hash)
    .maybeSingle();

  if (reqErr) return { ok: false, reason: 'db_error', detail: reqErr.message };
  if (!request) return { ok: false, reason: 'unknown_request' };
  if (request.tenant_id !== input.tenant_id) {
    // The hash exists but belongs to a different tenant. Treat as
    // unknown so we don't leak cross-tenant existence.
    return { ok: false, reason: 'tenant_mismatch' };
  }

  const row = {
    request_id: request.id,
    type: input.type,
    occurred_at: input.occurred_at,
    source: input.source,
    external_id: input.external_id ?? null,
    incomplete: !!input.incomplete,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from('events')
    .insert(row)
    .select('id')
    .single();

  if (error) {
    // Unique violation on (request_id, source, external_id) — retry
    // delivery from the provider; we already have it.
    if ((error as { code?: string }).code === '23505') {
      return { ok: true, event_id: null, request_id: request.id, deduped: true };
    }
    return { ok: false, reason: 'db_error', detail: error.message };
  }

  return { ok: true, event_id: data.id, request_id: request.id, deduped: false };
}
