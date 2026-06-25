import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  groupByService,
  listWebhookSecrets,
  mintWebhookSecret,
  revokeWebhookSecret,
  type WebhookSecretRow,
} from './dashboardWebhookSecrets';

function readStub(result: { data?: WebhookSecretRow[]; error?: { message: string } | null }): SupabaseClient {
  return {
    from() {
      return {
        select() {
          return {
            order: () => Promise.resolve({ data: result.data ?? [], error: result.error ?? null }),
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

function authedStub(jwt: string | null): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: jwt ? { access_token: jwt } : null },
      }),
    },
  } as unknown as SupabaseClient;
}

function row(overrides: Partial<WebhookSecretRow> = {}): WebhookSecretRow {
  return {
    id: 'sec-1',
    service: 'humblefax',
    prefix: 'abcd1234',
    created_at: '2026-01-01T00:00:00Z',
    revoked_at: null,
    ...overrides,
  };
}

describe('listWebhookSecrets', () => {
  it('returns rows on success', async () => {
    const rows = [row({ id: 'a' }), row({ id: 'b', service: 'twilio' })];
    const r = await listWebhookSecrets(readStub({ data: rows }));
    expect(r).toEqual({ ok: true, secrets: rows });
  });

  it('surfaces error message', async () => {
    const r = await listWebhookSecrets(readStub({ error: { message: 'rls denied' } }));
    expect(r).toEqual({ ok: false, message: 'rls denied' });
  });
});

describe('mintWebhookSecret', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('sends the JWT and service in the POST body', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ id: 's', service: 'humblefax', prefix: 'p', created_at: 't', secret: 'plain' }),
    });
    const r = await mintWebhookSecret(authedStub('jwt-1'), 'humblefax');
    expect(r.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/webhook-secrets',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }),
        body: JSON.stringify({ service: 'humblefax' }),
      }),
    );
  });

  it('surfaces server-side error message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'bad service' }),
    });
    const r = await mintWebhookSecret(authedStub('jwt-1'), 'twilio');
    expect(r).toEqual({ ok: false, message: 'bad service' });
  });

  it('returns ok:false when not signed in', async () => {
    const r = await mintWebhookSecret(authedStub(null), 'gmail');
    expect(r.ok).toBe(false);
  });
});

describe('revokeWebhookSecret', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('POSTs to the revoke endpoint', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await revokeWebhookSecret(authedStub('jwt-1'), 'sec-1');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/webhook-secrets/sec-1/revoke',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces a server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'boom' }),
    });
    const r = await revokeWebhookSecret(authedStub('jwt-1'), 'sec-1');
    expect(r).toEqual({ ok: false, message: 'boom' });
  });
});

describe('groupByService', () => {
  it('returns one group per known service even when there are no rows for it', () => {
    const groups = groupByService([]);
    expect(groups.map((g) => g.service)).toEqual(['humblefax', 'twilio', 'mailgun', 'gmail']);
    for (const g of groups) {
      expect(g.active).toBeNull();
      expect(g.revoked).toEqual([]);
    }
  });

  it('picks the active secret per service and stacks revoked rows', () => {
    const rows: WebhookSecretRow[] = [
      row({ id: 'hf-active', service: 'humblefax', revoked_at: null }),
      row({ id: 'hf-old', service: 'humblefax', revoked_at: '2025-12-01T00:00:00Z' }),
      row({ id: 'tw-active', service: 'twilio', revoked_at: null }),
    ];
    const groups = groupByService(rows);
    const humblefax = groups.find((g) => g.service === 'humblefax')!;
    const twilio = groups.find((g) => g.service === 'twilio')!;
    const gmail = groups.find((g) => g.service === 'gmail')!;
    expect(humblefax.active?.id).toBe('hf-active');
    expect(humblefax.revoked.map((r) => r.id)).toEqual(['hf-old']);
    expect(twilio.active?.id).toBe('tw-active');
    expect(gmail.active).toBeNull();
  });
});
