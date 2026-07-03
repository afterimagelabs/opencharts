// Pure helpers that map the public tracking payload's records-request status
// and timeline events onto patient-facing pills and row labels. Extracted out
// of TrackingPage.tsx so the decision logic is unit-testable without the DOM
// (mirrors CMS #1315's `emailClassificationBadge`).
//
// The canonical `status` string is OWNED by the CMS endpoint
// (deriveRecordsRequestStatus in publicTrackingController.ts). This file must
// stay in lockstep with that contract. When the CMS field is absent (the two
// PRs deploy independently), `resolveStatus` reproduces the page's original
// near-binary behavior so nothing regresses.

export type RecordsRequestStatus =
  | 'not_yet_sent'
  | 'awaiting_records'
  | 'update_received'
  | 'records_available'
  | 'denied'
  | 'records_received'
  | 'overdue';

// Timeline event types the page understands. call/fax/email are outbound
// contact; the records_* set are inbound provider signals surfaced from
// inbound faxes/emails (#1315); note_added is an internal note.
export type TimelineEventType =
  | 'call'
  | 'fax'
  | 'email'
  | 'records_received'
  | 'records_incomplete'
  | 'records_update'
  | 'records_available'
  | 'records_denied'
  | 'note_added';

// Pill / row accent tones. Backed by tailwind color tokens:
//   moss  = positive / complete (green)
//   amber = in-progress but positive (update, records ready)
//   seal  = needs attention (denial, overdue)
//   ink   = neutral
export type Tone = 'moss' | 'seal' | 'amber' | 'ink';

export type Pill = { tone: Tone; label: string };

const STATUS_PILL: Record<RecordsRequestStatus, Pill> = {
  records_received: { tone: 'moss', label: 'Records received' },
  records_available: { tone: 'amber', label: 'Records ready to retrieve' },
  update_received: { tone: 'amber', label: 'Update from provider' },
  denied: { tone: 'seal', label: 'Issue with request' },
  overdue: { tone: 'seal', label: 'Deadline passed' },
  not_yet_sent: { tone: 'moss', label: 'Awaiting first contact' },
  awaiting_records: { tone: 'moss', label: 'Within 30-day window' },
};

const ALL_STATUSES = Object.keys(STATUS_PILL) as RecordsRequestStatus[];

export function isRecordsRequestStatus(value: unknown): value is RecordsRequestStatus {
  return typeof value === 'string' && (ALL_STATUSES as string[]).includes(value);
}

/** Map a canonical status to its patient-facing pill. */
export function statusToPill(status: RecordsRequestStatus): Pill {
  return STATUS_PILL[status] ?? STATUS_PILL.awaiting_records;
}

/**
 * Reproduce the page's ORIGINAL status derivation from the legacy fields, for
 * when the CMS endpoint hasn't shipped the `status` field yet. Kept identical
 * to the pre-#19 pill logic so there is zero visual regression before the CMS
 * PR deploys.
 */
export function fallbackStatus(data: {
  records_received: boolean;
  deadline_passed: boolean;
  initial_request_at: string | null;
}): RecordsRequestStatus {
  if (data.records_received) return 'records_received';
  if (data.initial_request_at === null) return 'not_yet_sent';
  if (data.deadline_passed) return 'overdue';
  return 'awaiting_records';
}

/**
 * Prefer the CMS-provided canonical `status`; fall back to deriving it from the
 * legacy fields when it's absent or unrecognized.
 */
export function resolveStatus(data: {
  status?: string | null;
  records_received: boolean;
  deadline_passed: boolean;
  initial_request_at: string | null;
}): RecordsRequestStatus {
  if (isRecordsRequestStatus(data.status)) return data.status;
  return fallbackStatus(data);
}

/**
 * Patient-facing label + tone for a NEW records-lifecycle timeline row
 * (records_update / records_available / records_denied). Returns null for event
 * types the caller renders with its existing bespoke logic.
 */
export function recordsEventRow(
  type: TimelineEventType,
  accessMethod?: 'login' | 'link',
): { label: string; tone: Tone } | null {
  switch (type) {
    case 'records_update':
      return { label: 'Status update from provider', tone: 'amber' };
    case 'records_available':
      return {
        label:
          accessMethod === 'link'
            ? 'Records ready to retrieve · download link'
            : accessMethod === 'login'
              ? 'Records ready to retrieve · provider portal login'
              : 'Records ready to retrieve',
        tone: 'amber',
      };
    case 'records_denied':
      return { label: 'Provider reported an issue with the request', tone: 'seal' };
    default:
      return null;
  }
}
