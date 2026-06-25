import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  addNote,
  canAuthorOnRequest,
  claimMembership,
  loadMembership,
  setEventIncomplete,
} from './authoring';

function rpcStub(value: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data: value, error }) } as unknown as SupabaseClient;
}

describe('claimMembership', () => {
  it('returns the row-count from the RPC', async () => {
    const supabase = rpcStub(3);
    expect(await claimMembership(supabase)).toBe(3);
  });

  it('returns 0 on RPC error', async () => {
    const supabase = rpcStub(null, { message: 'boom' });
    expect(await claimMembership(supabase)).toBe(0);
  });

  it('returns 0 when the RPC returns a non-number', async () => {
    const supabase = rpcStub('weird');
    expect(await claimMembership(supabase)).toBe(0);
  });
});

describe('loadMembership', () => {
  it('returns null when no rows come back', async () => {
    const supabase = {
      from: () => ({
        select: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    } as unknown as SupabaseClient;
    expect(await loadMembership(supabase)).toBeNull();
  });

  it('returns the first row when present', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          limit: () =>
            Promise.resolve({
              data: [{ id: 'tu-1', tenant_id: 't-abc' }],
              error: null,
            }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(await loadMembership(supabase)).toEqual({ tenant_user_id: 'tu-1', tenant_id: 't-abc' });
  });
});

describe('canAuthorOnRequest', () => {
  it('returns the request id when RLS lets the user see the row', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: { id: 'req-1' }, error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(await canAuthorOnRequest(supabase, 'hash')).toBe('req-1');
  });

  it('returns null when RLS filters the row out', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
        }),
      }),
    } as unknown as SupabaseClient;
    expect(await canAuthorOnRequest(supabase, 'hash')).toBeNull();
  });
});

describe('addNote', () => {
  it('rejects empty content without hitting the network', async () => {
    const supabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient;
    const r = await addNote(supabase, 'req-1', 'tu-1', '   ');
    expect(r).toEqual({ ok: false, message: 'Note content cannot be empty.' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('inserts trimmed content and returns the new id', async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'note-1' }, error: null }),
      }),
    });
    const supabase = { from: vi.fn().mockReturnValue({ insert }) } as unknown as SupabaseClient;
    const r = await addNote(supabase, 'req-1', 'tu-1', '   hello   ');
    expect(r).toEqual({ ok: true, id: 'note-1' });
    expect(insert).toHaveBeenCalledWith({
      request_id: 'req-1',
      content: 'hello',
      source: 'ui',
      created_by: 'tu-1',
    });
  });

  it('surfaces RLS errors back to the caller', async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: null, error: { message: 'rls denied' } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    const r = await addNote(supabase, 'req-1', 'tu-1', 'hello');
    expect(r).toEqual({ ok: false, message: 'rls denied' });
  });
});

describe('setEventIncomplete', () => {
  it('updates the event and returns ok on success', async () => {
    const update = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ error: null }) });
    const supabase = { from: vi.fn().mockReturnValue({ update }) } as unknown as SupabaseClient;
    const r = await setEventIncomplete(supabase, 'evt-1', true);
    expect(r).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith({ incomplete: true });
  });

  it('surfaces an RLS error back to the caller', async () => {
    const supabase = {
      from: () => ({
        update: () => ({ eq: () => Promise.resolve({ error: { message: 'no' } }) }),
      }),
    } as unknown as SupabaseClient;
    const r = await setEventIncomplete(supabase, 'evt-1', false);
    expect(r).toEqual({ ok: false, message: 'no' });
  });
});
