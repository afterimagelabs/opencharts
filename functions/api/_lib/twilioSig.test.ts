import { describe, expect, it } from 'vitest';
import {
  buildFormSignedString,
  computeFormSignature,
  timingSafeEqual,
  verifyTwilioFormSignature,
} from './twilioSig';

describe('buildFormSignedString', () => {
  it('sorts parameters alphabetically by name', () => {
    expect(
      buildFormSignedString('https://example.com/twilio', { To: 'a', From: 'b', CallSid: 'c' }),
    ).toBe('https://example.com/twilioCallSidcFrombToa');
  });

  it('returns just the URL when no params are present', () => {
    expect(buildFormSignedString('https://example.com/twilio', {})).toBe('https://example.com/twilio');
  });
});

describe('computeFormSignature', () => {
  // Cross-checked against Node's `crypto.createHmac('sha1', token)`
  // over the same signedString. Both implementations agree on this
  // digest, so as long as buildFormSignedString matches Twilio's spec
  // (concat sorted-by-name name+value after the URL) we're bit-for-bit
  // compatible with Twilio's reference helper.
  //   token:    '12345'
  //   url:      'https://mycompany.com/myapp.php?foo=1&bar=2'
  //   params:   {CallSid, Caller, Digits, From, To}
  //   expected: 'RSOYDt4T1cUTdK1PDd93/VVr8B8='
  it('matches a known HMAC-SHA1 + base64 fixture', async () => {
    const sig = await computeFormSignature(
      '12345',
      'https://mycompany.com/myapp.php?foo=1&bar=2',
      {
        CallSid: 'CA1234567890ABCDE',
        Caller: '+14158675309',
        Digits: '1234',
        From: '+14158675309',
        To: '+18005551212',
      },
    );
    expect(sig).toBe('RSOYDt4T1cUTdK1PDd93/VVr8B8=');
  });

  it('is deterministic for the same inputs', async () => {
    const a = await computeFormSignature('secret', 'https://x/y', { K: 'v' });
    const b = await computeFormSignature('secret', 'https://x/y', { K: 'v' });
    expect(a).toBe(b);
  });

  it('changes when the auth token changes', async () => {
    const a = await computeFormSignature('secret-a', 'https://x/y', { K: 'v' });
    const b = await computeFormSignature('secret-b', 'https://x/y', { K: 'v' });
    expect(a).not.toBe(b);
  });
});

describe('verifyTwilioFormSignature', () => {
  it('accepts the known-good signature for the docs fixture', async () => {
    const ok = await verifyTwilioFormSignature(
      '12345',
      'https://mycompany.com/myapp.php?foo=1&bar=2',
      {
        CallSid: 'CA1234567890ABCDE',
        Caller: '+14158675309',
        Digits: '1234',
        From: '+14158675309',
        To: '+18005551212',
      },
      'RSOYDt4T1cUTdK1PDd93/VVr8B8=',
    );
    expect(ok).toBe(true);
  });

  it('rejects a flipped-bit signature', async () => {
    const ok = await verifyTwilioFormSignature(
      '12345',
      'https://mycompany.com/myapp.php?foo=1&bar=2',
      { CallSid: 'CA1234567890ABCDE' },
      'AAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    );
    expect(ok).toBe(false);
  });

  it('rejects null/empty presented signatures', async () => {
    expect(await verifyTwilioFormSignature('12345', 'https://x', {}, null)).toBe(false);
    expect(await verifyTwilioFormSignature('12345', 'https://x', {}, '')).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });
  it('returns false when one bit differs', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });
  it('returns false when lengths differ', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});
