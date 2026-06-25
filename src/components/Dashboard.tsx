// Tenant dashboard — landing page at /dashboard.
//
// The minimum-viable surface for now: magic-link sign-in, then a list
// of the tenant's requests with status + a link to each public
// timeline. Subsequent PRs add API key management, webhook secret
// management, and team management.

import { useEffect, useState } from 'react';
import { useMembership } from '../lib/useMembership';
import { deriveStatus, listRequests, statusLabel, type DashboardRequest } from '../lib/dashboard';
import DashboardApiKeys from './DashboardApiKeys';
import DashboardTeam from './DashboardTeam';
import DashboardWebhookSecrets from './DashboardWebhookSecrets';

type DashboardPage = 'requests' | 'api-keys' | 'webhook-secrets' | 'team';

function pickPage(path: string): DashboardPage {
  if (path.startsWith('/dashboard/api-keys')) return 'api-keys';
  if (path.startsWith('/dashboard/webhook-secrets')) return 'webhook-secrets';
  if (path.startsWith('/dashboard/team')) return 'team';
  return 'requests';
}

export default function Dashboard() {
  const { supabase, state, sendMagicLink, signOut } = useMembership();
  const [emailInput, setEmailInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const page = pickPage(typeof window !== 'undefined' ? window.location.pathname : '/dashboard');

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-4xl px-6 py-10 lg:py-14">
        <DashboardHeader />

        {state.kind === 'disabled' && (
          <Panel>
            <p className="text-ink-soft text-sm leading-relaxed">
              The dashboard isn't configured for this deploy. The site administrator needs
              to set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </Panel>
        )}

        {state.kind === 'signed_out' && (
          <Panel>
            <h2 className="font-serif text-2xl mb-2 font-semibold">Sign in</h2>
            <p className="text-ink-soft text-sm leading-relaxed mb-4">
              Enter the email you were invited with. We'll email you a one-time sign-in link.
            </p>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmitting(true);
                setErrorMsg(null);
                const r = await sendMagicLink(emailInput);
                setSubmitting(false);
                if (!r.ok) setErrorMsg(r.message);
              }}
            >
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="you@firm.com"
                className="flex-1 border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
              >
                {submitting ? 'Sending…' : 'Send link'}
              </button>
            </form>
            {errorMsg && (
              <p className="mt-3 text-sm text-seal" role="alert">
                {errorMsg}
              </p>
            )}
          </Panel>
        )}

        {state.kind === 'sent_link' && (
          <Panel>
            <p className="text-ink-soft text-sm leading-relaxed">
              We sent a sign-in link to <span className="font-mono">{state.email}</span>.
              Click it to come back here.
            </p>
          </Panel>
        )}

        {state.kind === 'claiming' && (
          <Panel>
            <p className="font-mono text-sm text-ink-muted">Loading…</p>
          </Panel>
        )}

        {state.kind === 'signed_in_no_access' && (
          <Panel>
            <p className="text-ink-soft text-sm leading-relaxed">
              You're signed in, but you don't have access to any tenant yet. Ask the
              person who invited you to confirm your email is on the invite list.
            </p>
            <button
              type="button"
              className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </Panel>
        )}

        {state.kind === 'signed_in' && supabase && (
          <SignedInDashboard
            supabase={supabase}
            page={page}
            onSignOut={() => void signOut()}
          />
        )}

        <p className="mt-10 text-xs text-ink-muted">
          OpenCharts · <a className="underline" href="/">opencharts.org</a>
        </p>
      </div>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="border-b hairline pb-6 mb-8">
      <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">
        OpenCharts · Tenant Dashboard
      </div>
      <h1 className="font-serif text-3xl lg:text-4xl mt-3 leading-tight tracking-tight font-semibold">
        Dashboard
      </h1>
    </header>
  );
}

function DashboardNav({ page }: { page: DashboardPage }) {
  const items: { id: DashboardPage; label: string; href: string }[] = [
    { id: 'requests', label: 'Requests', href: '/dashboard' },
    { id: 'api-keys', label: 'API keys', href: '/dashboard/api-keys' },
    { id: 'webhook-secrets', label: 'Webhook secrets', href: '/dashboard/webhook-secrets' },
    { id: 'team', label: 'Team', href: '/dashboard/team' },
  ];
  return (
    <nav className="flex gap-6 mb-8 border-b hairline text-[12px] uppercase tracking-[0.18em]">
      {items.map((it) => (
        <a
          key={it.id}
          href={it.href}
          className={`pb-3 ${
            it.id === page
              ? 'text-ink border-b-2 border-ink -mb-px font-semibold'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          {it.label}
        </a>
      ))}
    </nav>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="border hairline bg-paper/50 p-6">{children}</div>;
}

function SignedInDashboard({
  supabase,
  page,
  onSignOut,
}: {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  page: DashboardPage;
  onSignOut: () => void;
}) {
  return (
    <div>
      <DashboardNav page={page} />
      <div className="flex justify-end mb-4">
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
      {page === 'requests' && <RequestsView supabase={supabase} />}
      {page === 'api-keys' && <DashboardApiKeys supabase={supabase} />}
      {page === 'webhook-secrets' && <DashboardWebhookSecrets supabase={supabase} />}
      {page === 'team' && <DashboardTeam supabase={supabase} />}
    </div>
  );
}

function RequestsView({ supabase }: { supabase: import('@supabase/supabase-js').SupabaseClient }) {
  type State =
    | { kind: 'loading' }
    | { kind: 'ok'; requests: DashboardRequest[] }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await listRequests(supabase);
      if (cancelled) return;
      if (!r.ok) setState({ kind: 'error', message: r.message });
      else setState({ kind: 'ok', requests: r.requests });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
        {state.kind === 'ok' ? `${state.requests.length} requests` : ''}
      </div>
      {state.kind === 'loading' && (
        <Panel>
          <p className="font-mono text-sm text-ink-muted">Loading requests…</p>
        </Panel>
      )}
      {state.kind === 'error' && (
        <Panel>
          <p className="text-sm text-seal" role="alert">
            Could not load requests: {state.message}
          </p>
        </Panel>
      )}
      {state.kind === 'ok' && state.requests.length === 0 && (
        <Panel>
          <p className="text-ink-soft text-sm leading-relaxed">
            No records requests yet. Create one via{' '}
            <code className="font-mono">POST /api/v1/requests</code> with your tenant API
            key.
          </p>
        </Panel>
      )}
      {state.kind === 'ok' && state.requests.length > 0 && (
        <RequestsTable rows={state.requests} />
      )}
    </div>
  );
}

function RequestsTable({ rows }: { rows: DashboardRequest[] }) {
  return (
    <div className="border hairline overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_140px_120px] gap-4 px-5 py-3 bg-paper-warm/60 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        <div>Provider</div>
        <div>Patient ref</div>
        <div>Status</div>
        <div>Created</div>
      </div>
      <div className="divide-y hairline">
        {rows.map((r) => {
          const status = deriveStatus(r);
          return (
            <a
              key={r.id}
              href={`/request/${r.public_tracking_hash}`}
              className="grid grid-cols-[1fr_120px_140px_120px] gap-4 px-5 py-3 font-mono text-[13px] hover:bg-paper-warm/40"
            >
              <div className="text-ink truncate">
                {r.provider_name || (
                  <span className="text-ink-muted italic">(no provider name)</span>
                )}
              </div>
              <div className="text-ink-soft truncate">
                {r.patient_ref || <span className="text-ink-muted">—</span>}
              </div>
              <div className={statusToneClass(status)}>{statusLabel(status)}</div>
              <div className="text-ink-muted">{fmtShortDate(r.created_at)}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function statusToneClass(s: ReturnType<typeof deriveStatus>): string {
  if (s === 'received') return 'text-moss font-semibold';
  if (s === 'flagged_incomplete') return 'text-seal font-semibold';
  if (s === 'in_progress') return 'text-ink';
  return 'text-ink-muted';
}

function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
