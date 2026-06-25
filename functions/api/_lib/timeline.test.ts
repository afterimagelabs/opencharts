import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildTimelineForHash } from './timeline';

interface FakeData {
  requests?: Array<{
    id: string;
    public_tracking_hash: string;
    provider_name: string | null;
    records_received_at: string | null;
  }>;
  events?: Array<{
    id: string;
    request_id: string;
    type: string;
    occurred_at: string;
    incomplete: boolean;
  }>;
  notes?: Array<{
    id: string;
    request_id: string;
    content: string;
    created_at: string;
    updated_at: string;
  }>;
}

function makeSupabaseStub(seed: FakeData): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'requests') {
        return {
          select: () => ({
            eq: (_col: string, hash: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: (seed.requests ?? []).find((r) => r.public_tracking_hash === hash) ?? null,
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'events') {
        return {
          select: () => ({
            eq: (_col: string, requestId: string) => ({
              order: () =>
                Promise.resolve({
                  data: (seed.events ?? []).filter((e) => e.request_id === requestId),
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'notes') {
        return {
          select: () => ({
            eq: (_col: string, requestId: string) => ({
              order: () =>
                Promise.resolve({
                  data: (seed.notes ?? []).filter((n) => n.request_id === requestId),
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe('buildTimelineForHash', () => {
  it('returns null when the hash is unknown', async () => {
    const supabase = makeSupabaseStub({});
    expect(await buildTimelineForHash(supabase, 'nope')).toBeNull();
  });

  it('returns an empty-timeline shape when the request has no events', async () => {
    const supabase = makeSupabaseStub({
      requests: [
        { id: 'r1', public_tracking_hash: 'hash1', provider_name: 'St Foo', records_received_at: null },
      ],
    });
    const t = await buildTimelineForHash(supabase, 'hash1');
    expect(t).toEqual({
      hash: 'hash1',
      provider_name: 'St Foo',
      initial_request_at: null,
      initial_channel: null,
      deadline: null,
      days_open: null,
      deadline_passed: false,
      records_received: false,
      records_received_at: null,
      events: [],
    });
  });

  it('treats the first fax/email/call as the initial channel', async () => {
    const supabase = makeSupabaseStub({
      requests: [
        { id: 'r1', public_tracking_hash: 'hash1', provider_name: 'St Foo', records_received_at: null },
      ],
      events: [
        { id: 'e1', request_id: 'r1', type: 'fax', occurred_at: '2026-01-10T10:00:00Z', incomplete: false },
        { id: 'e2', request_id: 'r1', type: 'call', occurred_at: '2026-01-12T10:00:00Z', incomplete: false },
      ],
    });
    const t = await buildTimelineForHash(supabase, 'hash1');
    expect(t?.initial_channel).toBe('fax');
    expect(t?.initial_request_at).toBe('2026-01-10T10:00:00Z');
    expect(t?.deadline).toBe(new Date(Date.parse('2026-01-10T10:00:00Z') + 30 * 24 * 60 * 60 * 1000).toISOString());
  });

  it('stops the clock at records_received_at when received', async () => {
    const supabase = makeSupabaseStub({
      requests: [
        { id: 'r1', public_tracking_hash: 'hash1', provider_name: null, records_received_at: null },
      ],
      events: [
        { id: 'e1', request_id: 'r1', type: 'fax', occurred_at: '2026-01-10T10:00:00Z', incomplete: false },
        { id: 'e2', request_id: 'r1', type: 'records_received', occurred_at: '2026-01-15T10:00:00Z', incomplete: false },
      ],
    });
    const t = await buildTimelineForHash(supabase, 'hash1');
    expect(t?.records_received).toBe(true);
    expect(t?.records_received_at).toBe('2026-01-15T10:00:00Z');
    expect(t?.days_open).toBe(5);
    expect(t?.deadline_passed).toBe(false);
  });

  it('folds notes into the events stream as note_added rows', async () => {
    const supabase = makeSupabaseStub({
      requests: [
        { id: 'r1', public_tracking_hash: 'hash1', provider_name: null, records_received_at: null },
      ],
      events: [
        { id: 'e1', request_id: 'r1', type: 'fax', occurred_at: '2026-01-10T10:00:00Z', incomplete: false },
      ],
      notes: [
        {
          id: 'n1',
          request_id: 'r1',
          content: 'Spoke with intake nurse',
          created_at: '2026-01-11T10:00:00Z',
          updated_at: '2026-01-11T10:00:00Z',
        },
      ],
    });
    const t = await buildTimelineForHash(supabase, 'hash1');
    expect(t?.events.length).toBe(2);
    const note = t?.events.find((e) => e.type === 'note_added');
    expect(note?.content).toBe('Spoke with intake nurse');
  });

  it('passes the incomplete flag through to received events', async () => {
    const supabase = makeSupabaseStub({
      requests: [
        { id: 'r1', public_tracking_hash: 'hash1', provider_name: null, records_received_at: null },
      ],
      events: [
        { id: 'e1', request_id: 'r1', type: 'fax', occurred_at: '2026-01-10T10:00:00Z', incomplete: false },
        { id: 'e2', request_id: 'r1', type: 'records_received', occurred_at: '2026-01-15T10:00:00Z', incomplete: true },
      ],
    });
    const t = await buildTimelineForHash(supabase, 'hash1');
    const received = t?.events.find((e) => e.type === 'records_received');
    expect(received?.incomplete).toBe(true);
  });
});
