import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clearNativeCred, getNativeCredStatus, setNativeCred } from './dashboardNativeCreds';

function authedStub(jwt: string | null): SupabaseClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: jwt ? { access_token: jwt } : null },
      }),
    },
  } as unknown as SupabaseClient;
}

const realFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('getNativeCredStatus', () => {
  it('returns configured=false when nothing is set', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ configured: false, updated_at: null }),
    });
    const r = await getNativeCredStatus(authedStub('jwt-1'), 'twilio');
    expect(r).toEqual({ ok: true, status: { configured: false, updated_at: null } });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/native-creds/twilio',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-1' }),
      }),
    );
  });

  it('returns configured=true with the updated_at timestamp', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ configured: true, updated_at: '2026-06-25T00:00:00Z' }),
    });
    const r = await getNativeCredStatus(authedStub('jwt-1'), 'mailgun');
    expect(r).toEqual({
      ok: true,
      status: { configured: true, updated_at: '2026-06-25T00:00:00Z' },
    });
  });

  it('surfaces a server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'boom' }),
    });
    const r = await getNativeCredStatus(authedStub('jwt-1'), 'twilio');
    expect(r).toEqual({ ok: false, message: 'boom' });
  });

  it('returns ok:false when not signed in', async () => {
    const r = await getNativeCredStatus(authedStub(null), 'twilio');
    expect(r.ok).toBe(false);
  });
});

describe('setNativeCred', () => {
  it('rejects empty value without calling the endpoint', async () => {
    const r = await setNativeCred(authedStub('jwt-1'), 'twilio', '   ');
    expect(r).toEqual({ ok: false, message: 'Value is required.' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('sends auth_token for twilio', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await setNativeCred(authedStub('jwt-1'), 'twilio', '  abc123  ');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/native-creds/twilio',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ auth_token: 'abc123' }),
      }),
    );
  });

  it('sends signing_key for mailgun', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await setNativeCred(authedStub('jwt-1'), 'mailgun', 'sk-xyz');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/native-creds/mailgun',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ signing_key: 'sk-xyz' }),
      }),
    );
  });

  it('surfaces a server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'auth_token is required.' }),
    });
    const r = await setNativeCred(authedStub('jwt-1'), 'twilio', 'abc');
    expect(r).toEqual({ ok: false, message: 'auth_token is required.' });
  });
});

describe('clearNativeCred', () => {
  it('DELETEs the right path', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await clearNativeCred(authedStub('jwt-1'), 'mailgun');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/native-creds/mailgun',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces a server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'boom' }),
    });
    const r = await clearNativeCred(authedStub('jwt-1'), 'twilio');
    expect(r).toEqual({ ok: false, message: 'boom' });
  });
});
