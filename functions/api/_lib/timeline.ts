// Shared timeline-building logic used by the public read endpoint and
// (later) the tenant-scoped detail endpoint. Keeps the response shape
// consistent across both paths.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface TimelineEvent {
  id: string;
  at: string;
  type: 'fax' | 'email' | 'call' | 'records_received' | 'records_incomplete' | 'note_added';
  content?: string;
  incomplete?: boolean;
}

export interface TimelineResponse {
  hash: string;
  provider_name: string | null;
  initial_request_at: string | null;
  initial_channel: 'fax' | 'email' | 'call' | null;
  deadline: string | null;
  days_open: number | null;
  deadline_passed: boolean;
  records_received: boolean;
  records_received_at: string | null;
  events: TimelineEvent[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface RequestRow {
  id: string;
  public_tracking_hash: string;
  provider_name: string | null;
  records_received_at: string | null;
}

interface EventRow {
  id: string;
  type: TimelineEvent['type'];
  occurred_at: string;
  incomplete: boolean;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Build the public timeline response for a request. Notes fold into
 * the events stream as `note_added` rows so the frontend renders one
 * unified timeline. PHI is the tenant's responsibility — OpenCharts
 * stores whatever the tenant sends.
 *
 * Returns null when the hash doesn't match any request row.
 */
export async function buildTimelineForHash(
  supabase: SupabaseClient,
  hash: string,
): Promise<TimelineResponse | null> {
  const { data: request, error: requestErr } = await supabase
    .from('requests')
    .select('id, public_tracking_hash, provider_name, records_received_at')
    .eq('public_tracking_hash', hash)
    .maybeSingle<RequestRow>();

  if (requestErr) {
    throw new Error(`request lookup failed: ${requestErr.message}`);
  }
  if (!request) return null;

  const [{ data: eventRows, error: eventsErr }, { data: noteRows, error: notesErr }] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, type, occurred_at, incomplete')
        .eq('request_id', request.id)
        .order('occurred_at', { ascending: true }),
      supabase
        .from('notes')
        .select('id, content, created_at, updated_at')
        .eq('request_id', request.id)
        .order('updated_at', { ascending: true }),
    ]);

  if (eventsErr) throw new Error(`events lookup failed: ${eventsErr.message}`);
  if (notesErr) throw new Error(`notes lookup failed: ${notesErr.message}`);

  const events: TimelineEvent[] = [];

  for (const row of (eventRows ?? []) as EventRow[]) {
    events.push({
      id: row.id,
      at: row.occurred_at,
      type: row.type,
      ...(row.incomplete ? { incomplete: true } : {}),
    });
  }

  for (const note of (noteRows ?? []) as NoteRow[]) {
    events.push({
      id: note.id,
      at: note.updated_at ?? note.created_at,
      type: 'note_added',
      content: note.content,
    });
  }

  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const firstOutbound = events.find(
    (e) => e.type === 'fax' || e.type === 'email' || e.type === 'call',
  );
  const receivedEvent = events.find((e) => e.type === 'records_received');

  if (!firstOutbound) {
    return {
      hash,
      provider_name: request.provider_name,
      initial_request_at: null,
      initial_channel: null,
      deadline: null,
      days_open: null,
      deadline_passed: false,
      records_received: !!receivedEvent || !!request.records_received_at,
      records_received_at: receivedEvent?.at ?? request.records_received_at,
      events,
    };
  }

  const initialAt = new Date(firstOutbound.at);
  const clockEnd = receivedEvent ? new Date(receivedEvent.at) : new Date();
  const daysOpen = Math.floor((clockEnd.getTime() - initialAt.getTime()) / (1000 * 60 * 60 * 24));
  const deadline = new Date(initialAt.getTime() + THIRTY_DAYS_MS);
  const deadlinePassed = !receivedEvent && new Date() > deadline;

  return {
    hash,
    provider_name: request.provider_name,
    initial_request_at: firstOutbound.at,
    initial_channel: firstOutbound.type as 'fax' | 'email' | 'call',
    deadline: deadline.toISOString(),
    days_open: daysOpen,
    deadline_passed: deadlinePassed,
    records_received: !!receivedEvent,
    records_received_at: receivedEvent?.at ?? null,
    events,
  };
}
