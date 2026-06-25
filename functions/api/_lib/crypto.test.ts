import { describe, expect, it } from 'vitest';
import { generateToken, sha256Hex, timingSafeEqualHex, tokenPrefix } from './crypto';

describe('generateToken', () => {
  it('returns 64 hex characters', () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces unique values across calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(generateToken());
    expect(seen.size).toBe(100);
  });
});

describe('tokenPrefix', () => {
  it('returns the first 8 characters', () => {
    expect(tokenPrefix('abcdef0123456789' + '0'.repeat(48))).toBe('abcdef01');
  });
});

describe('sha256Hex', () => {
  it('matches a known test vector', async () => {
    // sha256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('is deterministic for the same input', async () => {
    const a = await sha256Hex('hello world');
    const b = await sha256Hex('hello world');
    expect(a).toBe(b);
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqualHex('deadbeef', 'deadbeef')).toBe(true);
  });

  it('returns false when strings differ', () => {
    expect(timingSafeEqualHex('deadbeef', 'deadbee0')).toBe(false);
  });

  it('returns false when lengths differ', () => {
    expect(timingSafeEqualHex('deadbeef', 'deadbeef00')).toBe(false);
  });
});
