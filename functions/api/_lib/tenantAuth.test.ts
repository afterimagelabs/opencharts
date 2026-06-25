import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateToken, sha256Hex, tokenPrefix } from './crypto';
import { authenticateTenant } from './tenantAuth';

interface ApiKeyRow {
  id: string;
  tenant_id: string;
  hashed_secret: string;
  revoked_at: string | null;
}

function makeSupabaseStub(rowsByPrefix: Map<string, ApiKeyRow[]>) {
  const update = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  const builder = (table: string) => {
    if (table === 'tenant_api_keys') {
      return {
        select: () => ({
          eq: (_col: string, prefix: string) => ({
            is: (_col2: string, _val: null) => {
              const rows = rowsByPrefix.get(prefix) ?? [];
              return Promise.resolve({ data: rows, error: null });
            },
          }),
        }),
        update,
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };
  return {
    from: builder,
    __updateCalls: update,
  } as unknown as SupabaseClient & { __updateCalls: ReturnType<typeof vi.fn> };
}

describe('authenticateTenant', () => {
  it('returns null when no Authorization header is sent', async () => {
    const supabase = makeSupabaseStub(new Map());
    expect(await authenticateTenant(supabase, null)).toBeNull();
    expect(await authenticateTenant(supabase, undefined)).toBeNull();
  });

  it('returns null for malformed Authorization headers', async () => {
    const supabase = makeSupabaseStub(new Map());
    expect(await authenticateTenant(supabase, 'Basic abc')).toBeNull();
    expect(await authenticateTenant(supabase, 'Bearer ')).toBeNull();
    expect(await authenticateTenant(supabase, 'Bearer not-hex!!!')).toBeNull();
  });

  it('returns null when the token is the right shape but unknown', async () => {
    const token = generateToken();
    const supabase = makeSupabaseStub(new Map()); // no rows
    expect(await authenticateTenant(supabase, `Bearer ${token}`)).toBeNull();
  });

  it('returns tenant_id when the token matches an active key', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const hashed = await sha256Hex(token);
    const supabase = makeSupabaseStub(
      new Map([
        [
          prefix,
          [{ id: 'key-1', tenant_id: 'tenant-abc', hashed_secret: hashed, revoked_at: null }],
        ],
      ]),
    );
    const result = await authenticateTenant(supabase, `Bearer ${token}`);
    expect(result).toEqual({ tenant_id: 'tenant-abc', api_key_id: 'key-1' });
  });

  it('rejects a token that matches the prefix but not the secret hash', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    // Wrong stored hash:
    const supabase = makeSupabaseStub(
      new Map([
        [
          prefix,
          [{ id: 'key-1', tenant_id: 'tenant-abc', hashed_secret: 'f'.repeat(64), revoked_at: null }],
        ],
      ]),
    );
    expect(await authenticateTenant(supabase, `Bearer ${token}`)).toBeNull();
  });

  it('writes last_used_at on successful auth', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const hashed = await sha256Hex(token);
    const supabase = makeSupabaseStub(
      new Map([
        [
          prefix,
          [{ id: 'key-1', tenant_id: 'tenant-abc', hashed_secret: hashed, revoked_at: null }],
        ],
      ]),
    );
    await authenticateTenant(supabase, `Bearer ${token}`);
    expect(supabase.__updateCalls).toHaveBeenCalledTimes(1);
  });
});
