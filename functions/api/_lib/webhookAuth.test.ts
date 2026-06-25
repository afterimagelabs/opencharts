import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateToken, sha256Hex, tokenPrefix } from './crypto';
import { authenticateWebhook, readWebhookSecret } from './webhookAuth';

interface SecretRow {
  id: string;
  tenant_id: string;
  hashed_secret: string;
  revoked_at: string | null;
  service: string;
}

function makeSupabaseStub(rows: SecretRow[]): SupabaseClient {
  return {
    from(table: string) {
      if (table !== 'webhook_secrets') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (_c: string, prefix: string) => ({
            eq: (_c2: string, service: string) => ({
              is: (_c3: string, _v: null) =>
                Promise.resolve({
                  data: rows.filter(
                    (r) => r.id.startsWith(prefix) || r.hashed_secret.startsWith(prefix.toLowerCase()),
                  ).filter((r) => r.service === service && r.revoked_at === null),
                  error: null,
                }),
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

// Better stub: returns rows whose prefix matches.
function makeStubByPrefix(map: Map<string, SecretRow[]>): SupabaseClient {
  return {
    from(table: string) {
      if (table !== 'webhook_secrets') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (_c: string, prefix: string) => ({
            eq: (_c2: string, service: string) => ({
              is: (_c3: string, _v: null) =>
                Promise.resolve({
                  data: (map.get(prefix) ?? []).filter(
                    (r) => r.service === service && r.revoked_at === null,
                  ),
                  error: null,
                }),
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;
}

describe('readWebhookSecret', () => {
  it('prefers the header when set', () => {
    const r = new Request('https://example.com/webhook?s=other', {
      headers: { 'X-OpenCharts-Webhook-Secret': 'from-header' },
    });
    expect(readWebhookSecret(r)).toBe('from-header');
  });

  it('falls back to the ?s= query param', () => {
    const r = new Request('https://example.com/webhook?s=from-query');
    expect(readWebhookSecret(r)).toBe('from-query');
  });

  it('returns null when neither is present', () => {
    const r = new Request('https://example.com/webhook');
    expect(readWebhookSecret(r)).toBeNull();
  });
});

describe('authenticateWebhook', () => {
  // makeSupabaseStub above is sloppy; use makeStubByPrefix for real tests.
  void makeSupabaseStub;

  it('returns null when no secret presented', async () => {
    const supabase = makeStubByPrefix(new Map());
    expect(await authenticateWebhook(supabase, 'humblefax', null)).toBeNull();
    expect(await authenticateWebhook(supabase, 'humblefax', '')).toBeNull();
  });

  it('returns null when secret format is wrong', async () => {
    const supabase = makeStubByPrefix(new Map());
    expect(await authenticateWebhook(supabase, 'humblefax', 'not-hex!')).toBeNull();
    expect(await authenticateWebhook(supabase, 'humblefax', 'a'.repeat(63))).toBeNull();
  });

  it('returns null when no active row matches', async () => {
    const token = generateToken();
    const supabase = makeStubByPrefix(new Map());
    expect(await authenticateWebhook(supabase, 'humblefax', token)).toBeNull();
  });

  it('returns tenant_id on a valid (prefix, service, hash) match', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const hashed = await sha256Hex(token);
    const supabase = makeStubByPrefix(
      new Map([
        [
          prefix,
          [
            {
              id: 'sec-1',
              tenant_id: 'tenant-abc',
              hashed_secret: hashed,
              revoked_at: null,
              service: 'humblefax',
            },
          ],
        ],
      ]),
    );
    const result = await authenticateWebhook(supabase, 'humblefax', token);
    expect(result).toEqual({ tenant_id: 'tenant-abc', webhook_secret_id: 'sec-1' });
  });

  it('rejects a secret that belongs to a different service', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const hashed = await sha256Hex(token);
    const supabase = makeStubByPrefix(
      new Map([
        [
          prefix,
          [
            {
              id: 'sec-1',
              tenant_id: 'tenant-abc',
              hashed_secret: hashed,
              revoked_at: null,
              service: 'humblefax', // not twilio
            },
          ],
        ],
      ]),
    );
    expect(await authenticateWebhook(supabase, 'twilio', token)).toBeNull();
  });

  it('rejects a secret whose hash mismatches', async () => {
    const token = generateToken();
    const prefix = tokenPrefix(token);
    const supabase = makeStubByPrefix(
      new Map([
        [
          prefix,
          [
            {
              id: 'sec-1',
              tenant_id: 'tenant-abc',
              hashed_secret: 'f'.repeat(64),
              revoked_at: null,
              service: 'humblefax',
            },
          ],
        ],
      ]),
    );
    expect(await authenticateWebhook(supabase, 'humblefax', token)).toBeNull();
  });
});
