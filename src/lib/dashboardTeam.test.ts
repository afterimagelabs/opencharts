import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  deriveStatus,
  inviteTenantUser,
  listTenantUsers,
  removeTenantUser,
  type TenantUserRow,
} from './dashboardTeam';

function readStub(result: { data?: TenantUserRow[]; error?: { message: string } | null }): SupabaseClient {
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

function row(overrides: Partial<TenantUserRow> = {}): TenantUserRow {
  return {
    id: 'tu-1',
    email: 'a@b.com',
    role: 'ops',
    created_at: '2026-01-01T00:00:00Z',
    user_id: null,
    ...overrides,
  };
}

describe('deriveStatus', () => {
  it('returns pending when user_id is null', () => {
    expect(deriveStatus(row({ user_id: null }))).toBe('pending');
  });
  it('returns active when user_id is set', () => {
    expect(deriveStatus(row({ user_id: 'u-1' }))).toBe('active');
  });
});

describe('listTenantUsers', () => {
  it('returns rows with derived status on success', async () => {
    const rows = [row({ id: 'a', user_id: null }), row({ id: 'b', user_id: 'u-1' })];
    const r = await listTenantUsers(readStub({ data: rows }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.members[0].status).toBe('pending');
      expect(r.members[1].status).toBe('active');
    }
  });

  it('surfaces RLS error', async () => {
    const r = await listTenantUsers(readStub({ error: { message: 'denied' } }));
    expect(r).toEqual({ ok: false, message: 'denied' });
  });
});

describe('inviteTenantUser', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('rejects empty email without calling the endpoint', async () => {
    const r = await inviteTenantUser(authedStub('jwt-1'), '   ', 'ops');
    expect(r).toEqual({ ok: false, message: 'Email is required.' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('normalizes email to lowercase before POSTing', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ tenant_user: row({ email: 'a@b.com' }) }),
    });
    const r = await inviteTenantUser(authedStub('jwt-1'), '  A@B.COM  ', 'admin');
    expect(r.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/tenant-users',
      expect.objectContaining({
        body: JSON.stringify({ email: 'a@b.com', role: 'admin' }),
      }),
    );
  });

  it('surfaces a server error', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ message: 'already invited' }),
    });
    const r = await inviteTenantUser(authedStub('jwt-1'), 'a@b.com', 'ops');
    expect(r).toEqual({ ok: false, message: 'already invited' });
  });

  it('returns ok:false when not signed in', async () => {
    const r = await inviteTenantUser(authedStub(null), 'a@b.com', 'ops');
    expect(r.ok).toBe(false);
  });
});

describe('removeTenantUser', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('sends a DELETE to the right path', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true });
    const r = await removeTenantUser(authedStub('jwt-1'), 'tu-1');
    expect(r).toEqual({ ok: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/v1/tenant-users/tu-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces the cannot_remove_self error from the server', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: 'cannot_remove_self',
          message: 'Use another tenant member to remove this user.',
        }),
    });
    const r = await removeTenantUser(authedStub('jwt-1'), 'tu-self');
    expect(r).toEqual({ ok: false, message: 'Use another tenant member to remove this user.' });
  });
});
