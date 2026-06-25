import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveStatus, listRequests, statusLabel, type DashboardRequest } from './dashboard';

function makeStub(result: { data?: unknown[]; error?: { message: string } | null }): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                limit() {
                  return Promise.resolve({
                    data: result.data ?? [],
                    error: result.error ?? null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function makeRequest(overrides: Partial<DashboardRequest> = {}): DashboardRequest {
  return {
    id: 'r1',
    public_tracking_hash: 'hash1',
    provider_name: 'St Foo',
    patient_ref: 'CASE-1',
    initial_request_at: null,
    records_received_at: null,
    records_incomplete_at: null,
    created_at: '2026-06-24T00:00:00Z',
    ...overrides,
  };
}

describe('listRequests', () => {
  it('returns the data when supabase responds ok', async () => {
    const rows = [makeRequest({ id: 'r1' }), makeRequest({ id: 'r2' })];
    const r = await listRequests(makeStub({ data: rows }));
    expect(r).toEqual({ ok: true, requests: rows });
  });

  it('returns ok with an empty array when no rows come back', async () => {
    const r = await listRequests(makeStub({ data: [] }));
    expect(r).toEqual({ ok: true, requests: [] });
  });

  it('surfaces the supabase error message on failure', async () => {
    const r = await listRequests(makeStub({ error: { message: 'rls denied' } }));
    expect(r).toEqual({ ok: false, message: 'rls denied' });
  });
});

describe('deriveStatus', () => {
  it('returns awaiting_first_contact when no timestamps set', () => {
    expect(deriveStatus(makeRequest())).toBe('awaiting_first_contact');
  });

  it('returns in_progress once the first outbound has been recorded', () => {
    expect(deriveStatus(makeRequest({ initial_request_at: '2026-06-01T00:00:00Z' }))).toBe(
      'in_progress',
    );
  });

  it('returns received when records_received_at is set', () => {
    expect(
      deriveStatus(
        makeRequest({
          initial_request_at: '2026-06-01T00:00:00Z',
          records_received_at: '2026-06-10T00:00:00Z',
        }),
      ),
    ).toBe('received');
  });

  it('returns flagged_incomplete when records_incomplete_at is set, even if also received', () => {
    expect(
      deriveStatus(
        makeRequest({
          initial_request_at: '2026-06-01T00:00:00Z',
          records_received_at: '2026-06-10T00:00:00Z',
          records_incomplete_at: '2026-06-12T00:00:00Z',
        }),
      ),
    ).toBe('flagged_incomplete');
  });
});

describe('statusLabel', () => {
  it('returns a human-readable label for each status', () => {
    expect(statusLabel('awaiting_first_contact')).toBe('Not yet sent');
    expect(statusLabel('in_progress')).toBe('In progress');
    expect(statusLabel('received')).toBe('Received');
    expect(statusLabel('flagged_incomplete')).toBe('Received · flagged incomplete');
  });
});
