import { useCallback, useEffect, useMemo, useState } from 'react';
import AuthoringPanel from './AuthoringPanel';
import { getBrowserSupabase } from '../lib/supabase';
import { setEventIncomplete } from '../lib/authoring';

type EventType =
  | 'call'
  | 'fax'
  | 'email'
  | 'records_received'
  | 'records_incomplete'
  | 'note_added';
type ContactChannel = 'call' | 'fax' | 'email';
type Event = {
  id: string;
  at: string;
  type: EventType;
  content?: string;
  // Only set for records_received events. True when ops flagged the
  // returned records as incomplete (partial, missing date ranges, etc.).
  incomplete?: boolean;
};

// Signed-in authoring context for the timeline rows. Set by
// AuthoringPanel when the visitor is signed in and belongs to the
// tenant that owns this request.
export type TimelineAuthoring = {
  requestId: string;
  tenantUserId: string;
};

type TrackingPayload = {
  hash: string;
  provider_name: string | null;
  initial_request_at: string | null;
  initial_channel: ContactChannel | null;
  deadline: string | null;
  days_open: number | null;
  deadline_passed: boolean;
  records_received: boolean;
  records_received_at: string | null;
  events: Event[];
};

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: TrackingPayload }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export default function TrackingPage({ hash }: { hash: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [authoring, setAuthoring] = useState<TimelineAuthoring | null>(null);

  const reload = useCallback(() => setReloadKey((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Default: hit the CF Pages Function which serves the timeline
        // directly from the OpenCharts Supabase project.
        //
        // VITE_TRACKING_API_BASE lets a local dev session bypass the
        // function and fetch a different upstream during development.
        const base =
          (import.meta.env.VITE_TRACKING_API_BASE as string | undefined)?.trim() ||
          '/api/track';
        const res = await fetch(`${base}/${encodeURIComponent(hash)}`, {
          headers: { Accept: 'application/json' },
        });
        if (cancelled) return;
        if (res.status === 404) {
          setState({ kind: 'not_found' });
          return;
        }
        if (!res.ok) {
          setState({ kind: 'error', message: `Upstream returned ${res.status}` });
          return;
        }
        const data = (await res.json()) as TrackingPayload;
        setState({ kind: 'ok', data });
      } catch (err) {
        if (cancelled) return;
        setState({ kind: 'error', message: 'Network error' });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [hash, reloadKey]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <Header />
        <Card state={state} hash={hash} authoring={authoring} onTimelineReload={reload} />
        {state.kind === 'ok' && (
          <AuthoringPanel hash={hash} onChange={reload} onAuthoringChange={setAuthoring} />
        )}
        <Footer />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="border-b hairline pb-6 mb-10">
      <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">
        OpenCharts · Public Tracking Record
      </div>
      <h1 className="font-serif text-3xl lg:text-4xl mt-3 leading-tight tracking-tight font-semibold">
        Records request tracking
      </h1>
      <p className="mt-3 text-ink-soft text-sm leading-relaxed">
        This page shows the timestamped contact events for a single records
        request and the internal notes recorded by the records team while
        following up.
      </p>
    </header>
  );
}

function Card({
  state,
  hash,
  authoring,
  onTimelineReload,
}: {
  state: State;
  hash: string;
  authoring: TimelineAuthoring | null;
  onTimelineReload: () => void;
}) {
  if (state.kind === 'loading') {
    return (
      <Panel>
        <div className="font-mono text-sm text-ink-muted">Loading…</div>
      </Panel>
    );
  }
  if (state.kind === 'not_found') {
    return (
      <Panel>
        <div className="text-ink">
          <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
            Record · {hash}
          </div>
          <h2 className="font-serif text-2xl mt-3 font-semibold">No such record.</h2>
          <p className="mt-3 text-ink-soft text-sm leading-relaxed">
            The tracking identifier above does not match any active records
            request in our system. If you were sent this URL, please confirm it
            with the patient or party who shared it.
          </p>
        </div>
      </Panel>
    );
  }
  if (state.kind === 'error') {
    return (
      <Panel>
        <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Record · {hash}
        </div>
        <h2 className="font-serif text-2xl mt-3 font-semibold text-seal">
          Could not load tracking record
        </h2>
        <p className="mt-3 text-ink-soft text-sm leading-relaxed">
          {state.message}. Please refresh the page; if the problem persists,
          contact the party who sent you this URL.
        </p>
      </Panel>
    );
  }

  return <Timeline data={state.data} authoring={authoring} onTimelineReload={onTimelineReload} />;
}

function Timeline({
  data,
  authoring,
  onTimelineReload,
}: {
  data: TrackingPayload;
  authoring: TimelineAuthoring | null;
  onTimelineReload: () => void;
}) {
  const eventCount = data.events.length;
  const notYetSent = data.initial_request_at === null;
  const status = useMemo(() => {
    if (data.records_received) {
      return { tone: 'moss' as const, label: 'Records received' };
    }
    if (notYetSent) {
      return { tone: 'moss' as const, label: 'Awaiting first contact' };
    }
    if (data.deadline_passed) {
      return { tone: 'seal' as const, label: 'Deadline passed' };
    }
    return { tone: 'moss' as const, label: 'Within 30-day window' };
  }, [data.deadline_passed, notYetSent, data.records_received]);

  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
        <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Record · {data.hash}
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      {data.provider_name && (
        <div className="mt-4 mb-2">
          <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">
            Records request to
          </div>
          <div className="font-serif text-2xl mt-1 font-semibold text-ink leading-tight">
            {data.provider_name}
          </div>
        </div>
      )}

      {notYetSent ? (
        <p className="mt-6 text-ink-soft leading-relaxed">
          The records request for this provider has been prepared but has not
          yet been sent. The 30-day clock starts when the first fax, email, or
          call goes out, not when the provider was added to the workflow.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-ink/15 border hairline mt-6">
          <Stat
            label={`Initial request · ${channelLabel(data.initial_channel!)}`}
            value={fmtDate(data.initial_request_at!)}
            sub={fmtTime(data.initial_request_at!)}
          />
          {data.records_received && data.records_received_at ? (
            <Stat
              label="Records received"
              value={fmtDate(data.records_received_at)}
              sub={fmtTime(data.records_received_at)}
            />
          ) : (
            <Stat
              label="30-day deadline"
              value={fmtDate(data.deadline!)}
              sub={fmtTime(data.deadline!)}
            />
          )}
          {data.records_received ? (
            <Stat
              label="Days to receipt"
              value={String(data.days_open)}
              sub={
                data.days_open! <= 30
                  ? `${30 - data.days_open!} under deadline`
                  : `${data.days_open! - 30} past deadline`
              }
            />
          ) : data.deadline_passed ? (
            <Stat
              label="Days open"
              value={String(data.days_open)}
              sub={`${data.days_open! - 30} past deadline`}
              tone="seal"
            />
          ) : (
            <Countdown deadlineIso={data.deadline!} />
          )}
        </div>
      )}

      <h3 className="font-serif text-xl mt-10 mb-3 font-semibold">
        Timeline
      </h3>
      <div className="font-mono text-[13px] leading-relaxed border hairline">
        <div className="px-5 py-3 border-b hairline bg-paper-warm/60 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink-muted">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-seal align-middle mr-2" />
            {eventCount} {eventCount === 1 ? 'event' : 'events'} logged
          </span>
          <span>chronological</span>
        </div>
        <div className="divide-y hairline">
          {(() => {
            const firstOutboundIdx = data.events.findIndex(
              (e) =>
                e.type !== 'records_received' &&
                e.type !== 'records_incomplete' &&
                e.type !== 'note_added',
            );

            // Splice in a synthetic "30-day deadline reached" milestone
            // row at the position the deadline timestamp falls in. The
            // milestone is only meaningful if we have an initial request
            // and the deadline timestamp itself is in the past (or in
            // the past relative to a later event).
            const rendered: React.ReactNode[] = [];
            const deadlineAt = data.deadline ? new Date(data.deadline) : null;
            const now = new Date();
            const showMilestone =
              !!deadlineAt &&
              now >= deadlineAt &&
              data.initial_request_at !== null;
            let milestoneInserted = false;

            data.events.forEach((event, i) => {
              if (
                showMilestone &&
                !milestoneInserted &&
                deadlineAt &&
                new Date(event.at) > deadlineAt
              ) {
                rendered.push(<MilestoneRow key={`milestone`} at={data.deadline!} />);
                milestoneInserted = true;
              }
              rendered.push(
                <Row
                  key={event.id || i}
                  event={event}
                  isFirst={i === firstOutboundIdx}
                  authoring={authoring}
                  onTimelineReload={onTimelineReload}
                />,
              );
            });
            // If the deadline is past every existing event, the milestone
            // belongs at the end of the timeline.
            if (showMilestone && !milestoneInserted) {
              rendered.push(<MilestoneRow key={`milestone`} at={data.deadline!} />);
            }
            return rendered;
          })()}
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-muted leading-relaxed">
        All entries are written at the time the corresponding event occurs and
        cannot be backdated. Contact rows list only the date and event
        category; the contents of the call, fax, or email are not exposed.
        Internal notes recorded by the records team are shown verbatim.
      </p>
    </Panel>
  );
}

function Row({
  event,
  isFirst,
  authoring,
  onTimelineReload,
}: {
  event: Event;
  isFirst: boolean;
  authoring: TimelineAuthoring | null;
  onTimelineReload: () => void;
}) {
  let label: React.ReactNode;
  let accent: string;
  if (event.type === 'records_received') {
    if (event.incomplete) {
      label = (
        <>
          Records received{' '}
          <span className="text-seal font-semibold">· flagged incomplete</span>
        </>
      );
      accent = 'text-moss font-semibold';
    } else {
      label = 'Records received';
      accent = 'text-moss font-semibold';
    }
  } else if (event.type === 'records_incomplete') {
    label = 'Records flagged incomplete';
    accent = 'text-seal font-semibold';
  } else if (event.type === 'note_added') {
    label = 'Internal note';
    accent = 'text-ink-muted italic';
  } else if (isFirst) {
    label = `Records request sent · ${channelLabel(event.type as ContactChannel)}`;
    accent = 'text-seal font-semibold';
  } else {
    label = followUpLabelFor(event.type as ContactChannel);
    accent = 'text-ink';
  }

  // Only records_received rows expose the incomplete toggle. fax/call/
  // email/note rows can have an `incomplete` flag too at the schema
  // level but it isn't UX-meaningful for them yet.
  const canToggle = authoring !== null && event.type === 'records_received' && !!event.id;

  return (
    <div className="grid grid-cols-[80px_60px_1fr] gap-4 px-5 py-3">
      <div className="text-ink-muted">{fmtDate(event.at)}</div>
      <div className="text-ink-muted">{fmtTime(event.at)}</div>
      <div>
        <div className={accent}>{label}</div>
        {event.type === 'note_added' && event.content && (
          <div className="mt-1 text-ink-soft text-[13px] leading-relaxed whitespace-pre-wrap font-sans not-italic">
            {event.content}
          </div>
        )}
        {canToggle && (
          <IncompleteToggle
            eventId={event.id}
            currentlyIncomplete={!!event.incomplete}
            onTimelineReload={onTimelineReload}
          />
        )}
      </div>
    </div>
  );
}

function IncompleteToggle({
  eventId,
  currentlyIncomplete,
  onTimelineReload,
}: {
  eventId: string;
  currentlyIncomplete: boolean;
  onTimelineReload: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
      <button
        type="button"
        disabled={submitting}
        onClick={async () => {
          const supabase = getBrowserSupabase();
          if (!supabase) return;
          setSubmitting(true);
          setLastError(null);
          const r = await setEventIncomplete(supabase, eventId, !currentlyIncomplete);
          setSubmitting(false);
          if (!r.ok) {
            setLastError(r.message);
            return;
          }
          onTimelineReload();
        }}
        className="underline hover:text-ink disabled:opacity-50"
      >
        {submitting
          ? 'Saving…'
          : currentlyIncomplete
            ? 'Unflag as incomplete'
            : 'Flag as incomplete'}
      </button>
      {lastError && (
        <span className="ml-2 text-seal normal-case tracking-normal" role="alert">
          {lastError}
        </span>
      )}
    </div>
  );
}

function followUpLabelFor(type: ContactChannel): string {
  switch (type) {
    case 'call':
      return 'Follow-up phone call';
    case 'fax':
      return 'Follow-up fax';
    case 'email':
      return 'Follow-up email';
  }
}

function channelLabel(type: ContactChannel): string {
  switch (type) {
    case 'call':
      return 'phone call';
    case 'fax':
      return 'fax';
    case 'email':
      return 'email';
  }
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-paper border hairline p-7 lg:p-10 shadow-sm">{children}</section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'ink' | 'seal';
}) {
  const valueCls =
    tone === 'seal'
      ? 'text-seal font-serif text-xl lg:text-2xl mt-2 font-semibold leading-tight'
      : 'text-ink font-serif text-xl lg:text-2xl mt-2 font-semibold leading-tight';
  return (
    <div className="bg-paper p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
      <div className={valueCls}>{value}</div>
      <div className="mt-1 text-[11px] text-ink-muted font-mono">{sub}</div>
    </div>
  );
}

function Countdown({ deadlineIso }: { deadlineIso: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const deadline = useMemo(() => new Date(deadlineIso), [deadlineIso]);
  const msLeft = Math.max(0, deadline.getTime() - now.getTime());
  const seconds = Math.floor(msLeft / 1000) % 60;
  const minutes = Math.floor(msLeft / (1000 * 60)) % 60;
  const hours = Math.floor(msLeft / (1000 * 60 * 60)) % 24;
  const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="bg-paper p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">
        Time until deadline
      </div>
      <div className="font-serif text-xl lg:text-2xl mt-2 font-semibold text-ink leading-tight tabular-nums">
        {days}
        <span className="text-ink-muted text-[11px] font-sans font-normal uppercase tracking-[0.18em] ml-1.5">
          d
        </span>{' '}
        {pad(hours)}
        <span className="text-ink-muted text-[11px] font-sans font-normal uppercase tracking-[0.18em] ml-1">
          h
        </span>{' '}
        {pad(minutes)}
        <span className="text-ink-muted text-[11px] font-sans font-normal uppercase tracking-[0.18em] ml-1">
          m
        </span>{' '}
        <span className="text-base text-ink-muted tabular-nums">{pad(seconds)}</span>
        <span className="text-ink-muted text-[11px] font-sans font-normal uppercase tracking-[0.18em] ml-0.5">
          s
        </span>
      </div>
      <div className="mt-1 text-[11px] text-ink-muted font-mono">
        until 30-day mark
      </div>
    </div>
  );
}

function MilestoneRow({ at }: { at: string }) {
  return (
    <div className="bg-seal/10 border-l-4 border-l-seal px-4 sm:px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-seal uppercase tracking-[0.12em] text-[11px] sm:text-[12px]">
          ⚑ 30-day deadline reached
        </span>
        <span className="text-ink-muted text-[11px] font-mono">
          {fmtDate(at)} · {fmtTime(at)}
        </span>
      </div>
      <div className="mt-1 text-[11px] sm:text-[12px] text-ink-soft">
        45 CFR § 164.524(b)(2)(i). After this point, the provider is out of
        compliance unless a written extension notice was received during the
        first 30 days.
      </div>
    </div>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'moss' | 'seal';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'seal'
      ? 'bg-seal/10 text-seal border-seal/40'
      : 'bg-moss/10 text-moss border-moss/40';
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm border text-[11px] uppercase tracking-[0.18em] font-semibold ${cls}`}
    >
      <span
        aria-hidden
        className={`inline-block w-1.5 h-1.5 rounded-full ${tone === 'seal' ? 'bg-seal' : 'bg-moss'}`}
      />
      {children}
    </span>
  );
}

function Footer() {
  return (
    <footer className="mt-12 pt-6 border-t hairline flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <span>
        <a href="/" className="hover:text-seal transition-colors">
          ← Back to OpenCharts
        </a>
      </span>
      <span className="font-mono">
        opencharts.org/request/&lt;hash&gt; · public timeline
      </span>
    </footer>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}
