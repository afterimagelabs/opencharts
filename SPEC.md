# Spec: Reflect richer records-request status types in the public tracking page

**Issue**: 19
**Branch**: tracking-status-types-19  (opencharts PR → **`production-ezra`**)
**Coupled CMS PR**: new cms worktree/branch → cms **`main`**
**Status**: draft — awaiting user review

> This file is the CONTRACT between the builder agent, the evaluator agent,
> and the user. Both agents read it before acting. When requirements change,
> this file must be updated FIRST — otherwise the evaluator will be testing
> against stale criteria.

---

## Problem

The public tracking page (`opencharts.org/request/<hash>`) models a records
request as a near-binary state: "Records received" or "not yet." Reality is
richer — providers send status updates, put records behind a portal login or a
download link, and deny/reject requests for missing info. CMS PR #1315 already
classifies inbound records emails into `records_update`,
`records_available_login`, `records_available_link`, `denial`, `reject`,
`other` (on `inbound_emails.email_classification`), but the public endpoint
never reads them, so a patient checking their request can't see what's actually
happening. Denials that arrive by fax/email even show up as "Records received,"
which is misleading.

## Goal

A patient viewing their tracking page sees the **current, specific** state of
their request — "Records ready to retrieve," "Update from provider," "Issue
with the request," or "Records received" — with a matching timeline entry, in
plain, reassuring language. Internal junk (`reject`) and unclassified
(`other`) emails never appear.

This ships as **two coupled PRs** with a single JSON contract:

1. **CMS** (`backend/src/controllers/publicTrackingController.ts` → cms `main`):
   enrich `/api/public/records-request/:hash` to read `inbound_emails` and
   denial `document_type`, emit the new event types, and return a canonical
   top-level `status`. **CMS owns and defines the contract below.**
2. **opencharts** (`src/components/TrackingPage.tsx` → `production-ezra`):
   consume `status` + the new event types and render patient-appropriate pills
   and timeline rows. Degrades gracefully to today's behavior if the CMS field
   is absent (PRs deploy independently).

---

## The JSON contract (defined by CMS, consumed by opencharts)

### New top-level field
- `status: string` — canonical records-request status, one of:
  - `not_yet_sent` — request prepared, no outbound contact logged yet
  - `awaiting_records` — sent, in the 30-day window, no provider response yet
  - `update_received` — provider sent a status update (no records yet)
  - `records_available` — records are ready via portal login or download link
  - `denied` — provider reported an issue / declined / needs more info
  - `records_received` — records actually received
  - `overdue` — sent, past the 30-day deadline, no positive records signal
- Existing fields unchanged: `hash`, `provider_name`, `initial_request_at`,
  `initial_channel`, `deadline`, `days_open`, `deadline_passed`,
  `records_received` (bool), `records_received_at`, `events`.

### `status` derivation (pure `deriveRecordsRequestStatus`, CMS)
1. No outbound contact → `not_yet_sent`.
2. Else take the **latest** records-lifecycle event by timestamp among
   `records_received` / `records_available` / `records_denied` /
   `records_update` and map it → `records_received` / `records_available` /
   `denied` / `update_received`. (Latest-wins so a denial followed by a
   re-request and receipt correctly reads `records_received`.)
3. No lifecycle event → `overdue` if `deadline_passed` else `awaiting_records`.

### New `events[].type` values
- `records_update` — from `inbound_emails.email_classification = 'records_update'`.
- `records_available` — from `records_available_login` / `records_available_link`;
  carries `access_method?: 'login' | 'link'`.
- `records_denied` — from `email_classification = 'denial'`, OR from an
  `inbound_faxes` / `inbound_emails` row with `document_type = 'denial'`.
- Existing types unchanged: `call`, `fax`, `email`, `records_received`,
  `records_incomplete`, `note_added`.
- **Behavior change:** a denial fax/email no longer emits `records_received`;
  it emits `records_denied`. The `records_received` bool and the days-open clock
  reflect actual receipt only.

### Redaction posture (unchanged bar)
- `email_classification` of `reject` and `other` are **never** surfaced
  (internal-only junk / needs-review).
- Raw `denial_reason` free text is **not** exposed. A `records_denied` event
  carries only the event type (+ a coarse, patient-safe category **only** if
  `denial_reason` is a known safe enum value; otherwise none).
- No new PHI is exposed beyond what the endpoint already exposes.

---

## Acceptance checks
_(Heading spelled exactly so the evaluator can fall back to SPEC.md. These are
the failing-test list for both repos.)_

- The CMS endpoint, for a provider with an `inbound_emails` row classified
  `records_available_login`, returns top-level `status: "records_available"`
  and an `events[]` entry `{ type: "records_available", access_method: "login" }`.
- The CMS endpoint, for a provider with an inbound `denial` (email
  classification `denial` **or** `document_type='denial'`), returns
  `status: "denied"` and a `records_denied` event — and does **not** count that
  row as `records_received`.
- The CMS endpoint never emits an event for `reject` or `other` classified
  emails.
- The opencharts pure `statusToPill(status)` helper returns the correct
  `{tone, label}` for every canonical `status` value (unit-tested), and returns
  a sensible fallback derived from `records_received`/`deadline_passed` when
  `status` is absent (backward compatibility with un-migrated CMS).
- On the tracking page, each new `status` renders its pill and each new event
  type renders a patient-appropriate timeline row (see mapping below).

## Acceptance criteria — Functional

- [ ] CMS `/api/public/records-request/:hash` returns a `status` field with the
      canonical values above, derived by a pure, unit-tested function.
- [ ] CMS reads `inbound_emails` matched to the provider and maps
      `email_classification` → event types (skipping `reject`/`other`).
- [ ] CMS reclassifies denial fax/email rows as `records_denied` (not
      `records_received`).
- [ ] opencharts `TrackingPage` renders the correct pill for each `status` and
      the correct timeline row for each new event type.
- [ ] opencharts falls back to today's behavior when `status` is missing.

## Acceptance criteria — UX

- [ ] Copy is patient-appropriate: plain, reassuring, no ops jargon or PHI.
- [ ] Status pill uses a tone that matches meaning (green=received/available,
      amber=update/in-progress-positive, red=denied/overdue, neutral=awaiting).
- [ ] Timeline rows for new events read clearly (e.g. "Records ready to
      retrieve — provider portal login", "Status update from provider",
      "Provider reported an issue with the request").
- [ ] No layout clashing/overflow; matches the existing legal-paper visual
      language (StatusPill, Stat, Row components reused).
- [ ] Text readable; visual hierarchy keeps the current status obvious.

### Proposed pill mapping (opencharts, final wording tunable)
| status | tone | pill label |
|---|---|---|
| `records_received` | moss (green) | Records received |
| `records_available` | amber | Records ready to retrieve |
| `update_received` | amber | Update from provider |
| `denied` | seal (red) | Issue with request |
| `overdue` | seal (red) | Deadline passed |
| `not_yet_sent` | moss | Awaiting first contact |
| `awaiting_records` | moss | Within 30-day window |

### Proposed timeline-row wording
| event type | row label |
|---|---|
| `records_update` | Status update from provider |
| `records_available` (login) | Records ready to retrieve · provider portal login |
| `records_available` (link) | Records ready to retrieve · download link |
| `records_denied` | Provider reported an issue with the request |

## User flows to test

### Happy path
1. Open `/request/<hash>` for a provider whose latest inbound email is
   classified `records_available_login`.
2. Status pill reads "Records ready to retrieve" (amber).
3. Timeline shows a "Records ready to retrieve · provider portal login" row at
   the email's timestamp.

### Denial path
1. Open `/request/<hash>` for a provider with an inbound denial.
2. Status pill reads "Issue with request" (red).
3. Timeline shows "Provider reported an issue with the request"; the page does
   NOT show "Records received".

### Backward-compat / empty state
1. Point opencharts at a CMS that hasn't deployed the `status` field (or a
   provider with no email activity). Page renders exactly as today
   (received / within-window / deadline-passed / awaiting-first-contact).

## Out of scope

- `AuditTrail.tsx` — static marketing sample data on the landing page, not
  wired to real requests. Not modified.
- Reading `case_tasks` / `records_denial:*` task rows (internal notes / PHI
  risk). Denial signal is taken from `inbound_faxes`/`inbound_emails`
  `document_type`/`email_classification` only.
- Surfacing raw `denial_reason` free text.
- Any change to how #1315 classifies emails (upstream, already merged).
- Real-time updates / websockets — page remains fetch-on-load.

## Open questions

- Final pill wording — "Records ready to retrieve" vs "Records available"; "Issue
  with request" vs "Request needs attention". Defaults above unless you prefer
  otherwise.
- Should `overdue` still win over `update_received`/`records_available` when a
  positive signal arrived after the deadline? Current design: positive signals
  win (more informative). Confirm.
- New `amber` tone: I'll add a muted ochre token to `tailwind.config` to fit the
  paper aesthetic. OK to add a color token?

## Notes

- opencharts has **no test runner today** — this PR adds `vitest` + a `test`
  script and a first test file (`src/lib/trackingStatus.ts` +
  `src/lib/__tests__/trackingStatus.test.ts`). Pure helpers extracted out of the
  component, mirroring #1315's `emailClassificationBadge` in cms
  `frontend/src/utils/recordsInbox.ts`.
- CMS test: extend `backend/src/__tests__/publicTrackingController.test.ts`
  (`npm test -w backend`, jest) with the new mapping + `deriveRecordsRequestStatus`.
- Coupling: the opencharts PR is independently shippable (graceful fallback);
  the new statuses only *appear* once the CMS PR is deployed. Testers exercise
  end-to-end via a local CMS backend (`VITE_TRACKING_API_BASE=…`) or after the
  CMS PR merges.
