// /dashboard/team — invite, list, remove tenant members.

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  inviteTenantUser,
  listTenantUsers,
  removeTenantUser,
  type TenantUserRole,
  type TenantUserView,
} from '../lib/dashboardTeam';

const ROLES: TenantUserRole[] = ['admin', 'ops', 'viewer'];

export default function DashboardTeam({ supabase }: { supabase: SupabaseClient }) {
  type State =
    | { kind: 'loading' }
    | { kind: 'ok'; members: TenantUserView[] }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<TenantUserRole>('ops');
  const [submitting, setSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await listTenantUsers(supabase);
      if (cancelled) return;
      if (!r.ok) setState({ kind: 'error', message: r.message });
      else setState({ kind: 'ok', members: r.members });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, reloadKey]);

  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold mb-1">Team</h2>
      <p className="text-ink-soft text-sm leading-relaxed mb-6">
        Invite members by email. They'll claim access by signing in at any{' '}
        <code className="font-mono">/request/&lt;hash&gt;</code> or{' '}
        <code className="font-mono">/dashboard</code> URL.
      </p>

      <div className="border hairline bg-paper/50 p-6 mb-6">
        <h3 className="font-serif text-lg font-semibold mb-3">Invite by email</h3>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitting(true);
            setInviteError(null);
            const r = await inviteTenantUser(supabase, emailInput, roleInput);
            setSubmitting(false);
            if (!r.ok) {
              setInviteError(r.message);
              return;
            }
            setEmailInput('');
            setReloadKey((n) => n + 1);
          }}
        >
          <input
            type="email"
            required
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="teammate@firm.com"
            className="flex-1 min-w-[220px] border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <select
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as TenantUserRole)}
            className="border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting || emailInput.trim().length === 0}
            className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
          >
            {submitting ? 'Inviting…' : 'Send invite'}
          </button>
        </form>
        {inviteError && (
          <p className="mt-2 text-sm text-seal" role="alert">
            {inviteError}
          </p>
        )}
      </div>

      {state.kind === 'loading' && (
        <p className="font-mono text-sm text-ink-muted">Loading team…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-seal" role="alert">
          Could not load team: {state.message}
        </p>
      )}
      {state.kind === 'ok' && state.members.length === 0 && (
        <p className="text-ink-soft text-sm">No members yet. Invite someone above.</p>
      )}
      {state.kind === 'ok' && state.members.length > 0 && (
        <MembersTable
          rows={state.members}
          onRemove={async (id) => {
            // eslint-disable-next-line no-alert
            if (!window.confirm('Remove this member?')) return;
            const r = await removeTenantUser(supabase, id);
            if (!r.ok) {
              // eslint-disable-next-line no-alert
              alert(`Could not remove: ${r.message}`);
              return;
            }
            setReloadKey((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function MembersTable({
  rows,
  onRemove,
}: {
  rows: TenantUserView[];
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <div className="border hairline overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_110px_120px_80px] gap-4 px-5 py-3 bg-paper-warm/60 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        <div>Email</div>
        <div>Role</div>
        <div>Status</div>
        <div>Invited</div>
        <div className="text-right">Actions</div>
      </div>
      <div className="divide-y hairline">
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_100px_110px_120px_80px] gap-4 px-5 py-3 font-mono text-[13px]"
          >
            <div className="text-ink truncate">{r.email}</div>
            <div className="text-ink-muted">{r.role}</div>
            <div className={r.status === 'active' ? 'text-moss' : 'text-ink-muted italic'}>
              {r.status}
            </div>
            <div className="text-ink-muted">{fmtShortDate(r.created_at)}</div>
            <div className="text-right">
              <button
                type="button"
                className="text-[11px] uppercase tracking-[0.18em] text-seal hover:underline"
                onClick={() => void onRemove(r.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
