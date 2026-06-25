import { describe, expect, it } from 'vitest';
import {
  extractHashFromAddressList,
  extractHashFromEmailAddress,
  extractHashFromOcToken,
  isValidHash,
} from './hashExtract';

describe('extractHashFromEmailAddress', () => {
  it('pulls a hash from records+<hash>@domain', () => {
    expect(extractHashFromEmailAddress('records+abcDEF1234567890@tenant.com')).toBe(
      'abcDEF1234567890',
    );
  });

  it('is case-insensitive on the literal records+', () => {
    expect(extractHashFromEmailAddress('Records+abcDEF1234567890@tenant.com')).toBe(
      'abcDEF1234567890',
    );
  });

  it('returns null when no records+ prefix is present', () => {
    expect(extractHashFromEmailAddress('hello@tenant.com')).toBeNull();
    expect(extractHashFromEmailAddress('records@tenant.com')).toBeNull();
  });

  it('returns null on null/empty input', () => {
    expect(extractHashFromEmailAddress(null)).toBeNull();
    expect(extractHashFromEmailAddress('')).toBeNull();
  });

  it('handles URL-safe base64 hash characters', () => {
    expect(extractHashFromEmailAddress('records+abc-DEF_123_456789@tenant.com')).toBe(
      'abc-DEF_123_456789',
    );
  });

  it('rejects hash bodies that are too short', () => {
    expect(extractHashFromEmailAddress('records+abc@tenant.com')).toBeNull();
  });
});

describe('extractHashFromAddressList', () => {
  it('returns the first hash found', () => {
    expect(
      extractHashFromAddressList([
        'someone@tenant.com',
        null,
        'records+abcDEF1234567890@tenant.com',
      ]),
    ).toBe('abcDEF1234567890');
  });

  it('returns null when no entry contains a hash', () => {
    expect(extractHashFromAddressList(['a@b.com', null, undefined])).toBeNull();
  });
});

describe('extractHashFromOcToken', () => {
  it('pulls a hash from oc:<hash>', () => {
    expect(extractHashFromOcToken('oc:abcDEF1234567890')).toBe('abcDEF1234567890');
  });

  it('pulls a hash even when embedded in a longer string', () => {
    expect(extractHashFromOcToken('case#42 oc:abcDEF1234567890 (followup)')).toBe(
      'abcDEF1234567890',
    );
  });

  it('returns null when no oc: token is present', () => {
    expect(extractHashFromOcToken('some other reference')).toBeNull();
  });
});

describe('isValidHash', () => {
  it('accepts a 22-char URL-safe base64 hash', () => {
    expect(isValidHash('abcDEF_1234-67890XYZab')).toBe(true);
  });

  it('rejects too-short hashes', () => {
    expect(isValidHash('short')).toBe(false);
  });

  it('rejects characters outside the alphabet', () => {
    expect(isValidHash('abc/def+123==')).toBe(false);
  });

  it('rejects null/empty', () => {
    expect(isValidHash(null)).toBe(false);
    expect(isValidHash('')).toBe(false);
  });
});
