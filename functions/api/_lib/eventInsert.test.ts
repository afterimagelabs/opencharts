import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { insertWebhookEvent } from './eventInsert';

interface FakeRequest {
  id: string;
  public_tracking_hash: string;
  tenant_id: string;
}

function makeStub({
  requests = [],
  insertResult,
}: {
  requests?: FakeRequest[];
  insertResult?: { data?: { id: string }; error?: { code?: string; message?: string } | null };
}): SupabaseClient {
  const insertSpy = vi.fn().mockReturnValue({
    select: () => ({
      single: () =>
        Promise.resolve({
          data: insertResult?.data ?? { id: 'new-event-id' },
          error: insertResult?.error ?? null,
        }),
    }),
  });

  return {
    from(table: string) {
      if (table === 'requests') {
        return {
          select: () => ({
            eq: (_c: string, hash: string) => ({
              maybeSingle: () =>
                Promise.resolve({
                  data:
                    requests.find((r) => r.public_tracking_hash === hash) &&
                    (() => {
                      const r = requests.find((x) => x.public_tracking_hash === hash)!;
                      return { id: r.id, tenant_id: r.tenant_id };
                    })(),
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'events') {
        return { insert: insertSpy };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

const VALID_HASH = 'abc-DEF_123_456789AB';

describe('insertWebhookEvent', () => {
  it('rejects an invalid hash format', async () => {
    const r = await insertWebhookEvent(makeStub({}), {
      tenant_id: 't1',
      hash: 'bad',
      type: 'fax',
      source: 'webhook:humblefax',
      occurred_at: '2026-06-24T00:00:00Z',
    });
    expect(r).toEqual({ ok: false, reason: 'invalid_hash' });
  });

  it('returns unknown_request when no row matches the hash', async () => {
    const r = await insertWebhookEvent(makeStub({}), {
      tenant_id: 't1',
      hash: VALID_HASH,
      type: 'fax',
      source: 'webhook:humblefax',
      occurred_at: '2026-06-24T00:00:00Z',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown_request');
  });

  it('returns tenant_mismatch when the hash belongs to a different tenant', async () => {
    const stub = makeStub({
      requests: [{ id: 'r1', public_tracking_hash: VALID_HASH, tenant_id: 'other-tenant' }],
    });
    const r = await insertWebhookEvent(stub, {
      tenant_id: 't1',
      hash: VALID_HASH,
      type: 'fax',
      source: 'webhook:humblefax',
      occurred_at: '2026-06-24T00:00:00Z',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('tenant_mismatch');
  });

  it('inserts and returns event_id on the happy path', async () => {
    const stub = makeStub({
      requests: [{ id: 'r1', public_tracking_hash: VALID_HASH, tenant_id: 't1' }],
      insertResult: { data: { id: 'evt-123' } },
    });
    const r = await insertWebhookEvent(stub, {
      tenant_id: 't1',
      hash: VALID_HASH,
      type: 'fax',
      source: 'webhook:humblefax',
      occurred_at: '2026-06-24T00:00:00Z',
      external_id: 'fax-1',
    });
    expect(r).toEqual({ ok: true, event_id: 'evt-123', request_id: 'r1', deduped: false });
  });

  it('returns deduped:true on unique-violation', async () => {
    const stub = makeStub({
      requests: [{ id: 'r1', public_tracking_hash: VALID_HASH, tenant_id: 't1' }],
      insertResult: { error: { code: '23505', message: 'duplicate' } },
    });
    const r = await insertWebhookEvent(stub, {
      tenant_id: 't1',
      hash: VALID_HASH,
      type: 'fax',
      source: 'webhook:humblefax',
      occurred_at: '2026-06-24T00:00:00Z',
      external_id: 'fax-1',
    });
    expect(r).toEqual({ ok: true, event_id: null, request_id: 'r1', deduped: true });
  });
});
