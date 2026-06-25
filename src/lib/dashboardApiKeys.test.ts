import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listApiKeys, mintApiKey, revokeApiKey } from './dashboardApiKeys';

function readStub(result: { data?: unknown[]; error?: { message: string } | null }): SupabaseClient {
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

describe('listApiKeys', () => {
  it('returns rows on success', async () => {
    const rows = [{ id: 'k1', prefix: 'abc', name: 'CMS', created_at: '2026-01-01', last_used_at: null, revoked_at: null }];
    const r = await listApiKeys(readStub({ data: rows }));
    expect(r).toEqual({ ok: true, api_keys: rows });
  });

  it('surfaces the error message on failure', async () => {
    const r = await listApiKeys(readStub({ error: { message: 'rls denied' } }));
    expect(r).toEqual({ ok: false, message: 'rls denied' });
  });
});

describe('mintApiKey', () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('rejects empty names without calling the endpoint', async () => {
    const r = await mintApiKey(authedStub('jwt-abc'), '   ');
    expect(r).toEqual({ ok: false, message: 'Name is required.' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends the JWT in the Authorization header and returns the minted key', async () => {
    const mockKey = { id: 'k1', prefix: 'abc', name: 'CMS', created_at: '2026-01-01', secret: 'plain' };
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockKey),
    });
    const r = await mintApiKey(authedStub('jwt-abc'), '  CMS  ');
    expect(r).toEqual({ ok: true, api_key: mockKey });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/api-keys',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-abc' }),
        body: JSON.stringify({ name: 'CMS' }),
      }),
    );
  });

  it('surfaces a server error message', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'boom' }),
    });
    const r = await mintApiKey(authedStub('jwt-abc'), 'CMS');
    expect(r).toEqual({ ok: false, message: 'boom' });
  });

  it('returns a friendly error when not signed in', async () => {
    const r = await mintApiKey(authedStub(null), 'CMS');
    expect(r.ok).toBe(false);
  });
});

describe('revokeApiKey', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('POSTs to the revoke endpoint and returns ok on success', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await revokeApiKey(authedStub('jwt-abc'), 'key-1');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/api-keys/key-1/revoke',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces the server error message on failure', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'nope' }),
    });
    const r = await revokeApiKey(authedStub('jwt-abc'), 'key-1');
    expect(r).toEqual({ ok: false, message: 'nope' });
  });
});
