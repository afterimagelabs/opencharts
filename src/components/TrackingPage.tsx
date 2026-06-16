import { useEffect, useMemo, useState } from 'react';

type Event = {
  at: string;
  type: 'initiated' | 'call' | 'fax' | 'email';
};

type TrackingPayload = {
  hash: string;
  initial_request_at: string;
  deadline: string;
  days_open: number;
  deadline_passed: boolean;
  events: Event[];
};

type State =
  | { kind: 'loading' }
  | { kind: 'ok'; data: TrackingPayload }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string };

export default function TrackingPage({ hash }: { hash: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Default: hit the CF Pages Function which proxies to the
        // records backend so the browser only sees opencharts.org URLs.
        //
        // VITE_TRACKING_API_BASE lets a local dev session bypass the
        // function and fetch the records backend directly. Set it to
        // the CMS backend's public-route URL during dev:
        //   VITE_TRACKING_API_BASE=http://localhost:3001/api/public/records-request
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
  }, [hash]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12 lg:py-16">
        <Header />
        <Card state={state} hash={hash} />
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
        request. It contains no protected health information.
      </p>
    </header>
  );
}

function Card({ state, hash }: { state: State; hash: string }) {
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

  return <Timeline data={state.data} />;
}

function Timeline({ data }: { data: TrackingPayload }) {
  const eventCount = data.events.length;
  const status = useMemo(() => {
    if (data.deadline_passed) {
      return { tone: 'seal' as const, label: 'Deadline passed' };
    }
    return { tone: 'moss' as const, label: 'Within 30-day window' };
  }, [data.deadline_passed]);

  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
        <div className="font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
          Record · {data.hash}
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>

      <div className="grid grid-cols-3 gap-px bg-ink/15 border hairline mt-6">
        <Stat label="Initial request" value={fmtDate(data.initial_request_at)} sub={fmtTime(data.initial_request_at)} />
        <Stat label="30-day deadline" value={fmtDate(data.deadline)} sub={fmtTime(data.deadline)} />
        <Stat
          label="Days open"
          value={String(data.days_open)}
          sub={data.deadline_passed ? `${data.days_open - 30} past deadline` : `${30 - data.days_open} remaining`}
        />
      </div>

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
          {data.events.map((event, i) => (
            <Row key={i} event={event} />
          ))}
        </div>
      </div>

      <p className="mt-8 text-xs text-ink-muted leading-relaxed">
        All entries are written at the time the corresponding event occurs and
        cannot be backdated. This page lists only dates and event categories;
        no patient identity, condition, address, or contents of any
        communication are exposed.
      </p>
    </Panel>
  );
}

function Row({ event }: { event: Event }) {
  const label = labelFor(event.type);
  const accent = event.type === 'initiated' ? 'text-seal font-semibold' : 'text-ink';
  return (
    <div className="grid grid-cols-[80px_60px_1fr] gap-4 px-5 py-3">
      <div className="text-ink-muted">{fmtDate(event.at)}</div>
      <div className="text-ink-muted">{fmtTime(event.at)}</div>
      <div className={accent}>{label}</div>
    </div>
  );
}

function labelFor(type: Event['type']): string {
  switch (type) {
    case 'initiated':
      return 'Records request initiated';
    case 'call':
      return 'Follow-up phone call';
    case 'fax':
      return 'Fax sent';
    case 'email':
      return 'Follow-up email';
  }
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-paper border hairline p-7 lg:p-10 shadow-sm">{children}</section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-paper p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
      <div className="font-serif text-xl lg:text-2xl mt-2 font-semibold text-ink leading-tight">
        {value}
      </div>
      <div className="mt-1 text-[11px] text-ink-muted font-mono">{sub}</div>
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
        opencharts.org/request/&lt;hash&gt; · public timeline · no PHI
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
