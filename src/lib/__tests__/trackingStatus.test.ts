import { describe, it, expect } from 'vitest';
import {
  statusToPill,
  fallbackStatus,
  resolveStatus,
  recordsEventRow,
  isRecordsRequestStatus,
  type RecordsRequestStatus,
} from '../trackingStatus';

describe('statusToPill', () => {
  const cases: Array<[RecordsRequestStatus, string, string]> = [
    ['records_received', 'moss', 'Records received'],
    ['records_available', 'amber', 'Records ready to retrieve'],
    ['update_received', 'amber', 'Update from provider'],
    ['denied', 'seal', 'Issue with request'],
    ['overdue', 'seal', 'Deadline passed'],
    ['not_yet_sent', 'moss', 'Awaiting first contact'],
    ['awaiting_records', 'moss', 'Within 30-day window'],
  ];
  it.each(cases)('%s → tone %s / label "%s"', (status, tone, label) => {
    expect(statusToPill(status)).toEqual({ tone, label });
  });

  it('falls back to the awaiting pill for an unknown status', () => {
    expect(statusToPill('bogus' as RecordsRequestStatus)).toEqual({
      tone: 'moss',
      label: 'Within 30-day window',
    });
  });
});

describe('isRecordsRequestStatus', () => {
  it('accepts every canonical value', () => {
    for (const s of [
      'not_yet_sent',
      'awaiting_records',
      'update_received',
      'records_available',
      'denied',
      'records_received',
      'overdue',
    ]) {
      expect(isRecordsRequestStatus(s)).toBe(true);
    }
  });
  it('rejects junk', () => {
    expect(isRecordsRequestStatus('nope')).toBe(false);
    expect(isRecordsRequestStatus(undefined)).toBe(false);
    expect(isRecordsRequestStatus(null)).toBe(false);
    expect(isRecordsRequestStatus(42)).toBe(false);
  });
});

describe('fallbackStatus (legacy fields → status, no regression)', () => {
  it('records_received wins', () => {
    expect(
      fallbackStatus({ records_received: true, deadline_passed: true, initial_request_at: '2026-01-01' }),
    ).toBe('records_received');
  });
  it('not_yet_sent when no initial request', () => {
    expect(
      fallbackStatus({ records_received: false, deadline_passed: false, initial_request_at: null }),
    ).toBe('not_yet_sent');
  });
  it('overdue when past deadline', () => {
    expect(
      fallbackStatus({ records_received: false, deadline_passed: true, initial_request_at: '2026-01-01' }),
    ).toBe('overdue');
  });
  it('awaiting_records otherwise', () => {
    expect(
      fallbackStatus({ records_received: false, deadline_passed: false, initial_request_at: '2026-01-01' }),
    ).toBe('awaiting_records');
  });
});

describe('resolveStatus', () => {
  const legacy = {
    records_received: false,
    deadline_passed: false,
    initial_request_at: '2026-01-01',
  };

  it('prefers a valid CMS-provided status', () => {
    expect(resolveStatus({ ...legacy, status: 'records_available' })).toBe('records_available');
    expect(resolveStatus({ ...legacy, status: 'denied' })).toBe('denied');
  });

  it('falls back when status is absent (CMS not deployed yet)', () => {
    expect(resolveStatus({ ...legacy, status: undefined })).toBe('awaiting_records');
    expect(resolveStatus({ ...legacy, status: null })).toBe('awaiting_records');
  });

  it('falls back when status is unrecognized', () => {
    expect(resolveStatus({ ...legacy, status: 'weird_future_value' })).toBe('awaiting_records');
  });

  it('legacy records_received still resolves correctly without a status', () => {
    expect(
      resolveStatus({ status: undefined, records_received: true, deadline_passed: false, initial_request_at: '2026-01-01' }),
    ).toBe('records_received');
  });
});

describe('recordsEventRow', () => {
  it('records_update → status update, amber', () => {
    expect(recordsEventRow('records_update')).toEqual({
      label: 'Status update from provider',
      tone: 'amber',
    });
  });

  it('records_available with login access', () => {
    expect(recordsEventRow('records_available', 'login')).toEqual({
      label: 'Records ready to retrieve · provider portal login',
      tone: 'amber',
    });
  });

  it('records_available with link access', () => {
    expect(recordsEventRow('records_available', 'link')).toEqual({
      label: 'Records ready to retrieve · download link',
      tone: 'amber',
    });
  });

  it('records_available with no access method still labels sanely', () => {
    expect(recordsEventRow('records_available')).toEqual({
      label: 'Records ready to retrieve',
      tone: 'amber',
    });
  });

  it('records_denied → issue, seal', () => {
    expect(recordsEventRow('records_denied')).toEqual({
      label: 'Provider reported an issue with the request',
      tone: 'seal',
    });
  });

  it('returns null for event types rendered by existing logic', () => {
    expect(recordsEventRow('call')).toBeNull();
    expect(recordsEventRow('fax')).toBeNull();
    expect(recordsEventRow('records_received')).toBeNull();
    expect(recordsEventRow('note_added')).toBeNull();
  });
});
