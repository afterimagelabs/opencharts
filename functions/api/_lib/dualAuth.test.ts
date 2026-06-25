import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateToken, sha256Hex, tokenPrefix } from './crypto';
import { authenticateAnyTenant } from './dualAuth';

interface ApiKeyRow {
  id: string;
  tenant_id: string;
  hashed_secret: string;
  revoked_at: string | null;
}

interface TenantUserRow {
  id: string;
  tenant_id: string;
}

interface StubOpts {
  apiKeyRowsByPrefix?: Map<string, ApiKeyRow[]>;
  jwtUser?: { id: string; error?: unknown } | null;
  tenantUserByUserId?: Map<string, TenantUserRow[]>;
}

function makeStub(opts: StubOpts): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'tenant_api_keys') {
        return {
          select: () => ({
            eq: (_c: string, prefix: string) => ({
              is: () =>
                Promise.resolve({
                  data: opts.apiKeyRowsByPrefix?.get(prefix) ?? [],
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      if (table === 'tenant_users') {
        return {
          select: () => ({
            eq: (_c: string, userId: string) => ({
              limit: () =>
                Promise.resolve({
                  data: opts.tenantUserByUserId?.get(userId) ?? [],
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    auth: {
      getUser: vi.fn(async (_token: string) => {
        if (!opts.jwtUser) return { data: { user: null }, error: { message: 'no user' } };
        if (opts.jwtUser.error) return { data: { user: null }, error: opts.jwtUser.error };
        return { data: { user: { id: opts.jwtUser.id } }, error: null };
      }),
    },
  } as unknown as SupabaseClient;
}

describe('authenticateAnyTenant', () => {
  it('returns null when no header is provided', async () => {
    const supabase = makeStub({});
    expect(await authenticateAnyTenant(supabase, null)).toBeNull();
    expect(await authenticateAnyTenant(supabase, undefined)).toBeNull();
  });

  it('returns null when the header is not Bearer-shaped', async () => {
    const supabase = makeStub({});
    expect(await authenticateAnyTenant(supabase, 'Basic abc')).toBeNull();
  });

  it('routes 64-hex tokens through the API-key path', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const hashed = await sha256Hex(token);
    const supabase = makeStub({
      apiKeyRowsByPrefix: new Map([
        [prefix, [{ id: 'k1', tenant_id: 't-abc', hashed_secret: hashed, revoked_at: null }]],
      ]),
    });
    const result = await authenticateAnyTenant(supabase, `Bearer ${token}`);
    expect(result).toEqual({ source: 'api_key', tenant_id: 't-abc', api_key_id: 'k1' });
  });

  it('routes non-hex tokens through the JWT path and returns the matched tenant', async () => {
    const supabase = makeStub({
      jwtUser: { id: 'user-1' },
      tenantUserByUserId: new Map([['user-1', [{ id: 'tu-1', tenant_id: 't-xyz' }]]]),
    });
    const result = await authenticateAnyTenant(supabase, 'Bearer eyJhbGciOi...some.jwt');
    expect(result).toEqual({ source: 'jwt', tenant_id: 't-xyz', tenant_user_id: 'tu-1' });
  });

  it('returns null when the JWT is rejected by Supabase', async () => {
    const supabase = makeStub({ jwtUser: null });
    expect(await authenticateAnyTenant(supabase, 'Bearer eyJ.invalid')).toBeNull();
  });

  it('returns null when the JWT resolves but no tenant_users row exists', async () => {
    const supabase = makeStub({
      jwtUser: { id: 'user-1' },
      tenantUserByUserId: new Map(), // no row
    });
    expect(await authenticateAnyTenant(supabase, 'Bearer eyJ.foo')).toBeNull();
  });

  it('returns null when an API-key-shaped token does not match any row', async () => {
    const token = generateToken();
    const supabase = makeStub({ apiKeyRowsByPrefix: new Map() });
    expect(await authenticateAnyTenant(supabase, `Bearer ${token}`)).toBeNull();
  });
});
