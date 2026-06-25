import { describe, expect, it } from 'vitest';
import {
  computeMailgunSignature,
  timingSafeEqualHex,
  verifyMailgunSignature,
} from './mailgunSig';

const KEY = 'my-key';
const TS = '1234567890';
const TOKEN = 'abcDEF123';
// Cross-checked against Node's crypto.createHmac('sha256', 'my-key')
// over the string '1234567890abcDEF123' to guarantee the helper is
// bit-for-bit compatible with Mailgun's reference verification.
const EXPECTED_SIG = 'dd824247a0b95de744a1739a9e87e523f2e8ce10517b602624132706b286ac7e';
const FROZEN_NOW = 1234567900;

describe('computeMailgunSignature', () => {
  it('matches a Node-confirmed HMAC-SHA256 fixture', async () => {
    expect(await computeMailgunSignature(KEY, TS, TOKEN)).toBe(EXPECTED_SIG);
  });

  it('is sensitive to key changes', async () => {
    const a = await computeMailgunSignature(KEY, TS, TOKEN);
    const b = await computeMailgunSignature('other-key', TS, TOKEN);
    expect(a).not.toBe(b);
  });

  it('is sensitive to token changes', async () => {
    const a = await computeMailgunSignature(KEY, TS, TOKEN);
    const b = await computeMailgunSignature(KEY, TS, TOKEN + 'x');
    expect(a).not.toBe(b);
  });
});

describe('verifyMailgunSignature', () => {
  it('accepts a valid signature within the freshness window', async () => {
    const r = await verifyMailgunSignature(
      KEY,
      { timestamp: TS, token: TOKEN, signature: EXPECTED_SIG },
      FROZEN_NOW,
    );
    expect(r).toEqual({ ok: true });
  });

  it('rejects a stale timestamp (>5 minutes off)', async () => {
    const r = await verifyMailgunSignature(
      KEY,
      { timestamp: TS, token: TOKEN, signature: EXPECTED_SIG },
      FROZEN_NOW + 10 * 60, // 10 minutes ahead
    );
    expect(r).toEqual({ ok: false, reason: 'stale_timestamp' });
  });

  it('rejects when required fields are missing', async () => {
    const r = await verifyMailgunSignature(
      KEY,
      { timestamp: TS, token: TOKEN, signature: null },
      FROZEN_NOW,
    );
    expect(r).toEqual({ ok: false, reason: 'missing_fields' });

    const r2 = await verifyMailgunSignature(
      KEY,
      { timestamp: null, token: TOKEN, signature: EXPECTED_SIG },
      FROZEN_NOW,
    );
    expect(r2).toEqual({ ok: false, reason: 'missing_fields' });
  });

  it('rejects a bad signature', async () => {
    const r = await verifyMailgunSignature(
      KEY,
      { timestamp: TS, token: TOKEN, signature: 'a'.repeat(64) },
      FROZEN_NOW,
    );
    expect(r).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('accepts numeric timestamps too', async () => {
    const r = await verifyMailgunSignature(
      KEY,
      { timestamp: 1234567890, token: TOKEN, signature: EXPECTED_SIG },
      FROZEN_NOW,
    );
    expect(r).toEqual({ ok: true });
  });
});

describe('timingSafeEqualHex', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqualHex('abcd', 'abcd')).toBe(true);
  });
  it('returns false for one-bit difference', () => {
    expect(timingSafeEqualHex('abcd', 'abce')).toBe(false);
  });
  it('returns false for length difference', () => {
    expect(timingSafeEqualHex('abcd', 'abcde')).toBe(false);
  });
});
