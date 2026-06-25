// Magic-link sign-in + note authoring UI for tenant members.
//
// Renders nothing when:
//   - VITE_SUPABASE_URL/KEY aren't configured (the SPA isn't wired
//     up to the new project, e.g. on the production-ezra build), or
//   - the visitor isn't signed in and hasn't asked to sign in.
//
// When signed in AND the user's tenant owns this request, the visitor
// can add a note. (The per-event incomplete toggle lives on the
// timeline rows themselves and is wired in TrackingPage.)

import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getBrowserSupabase } from '../lib/supabase';
import { addNote, canAuthorOnRequest, claimMembership, loadMembership } from '../lib/authoring';

type AuthState =
  | { kind: 'disabled' }                     // env vars not set
  | { kind: 'signed_out' }
  | { kind: 'sent_link'; email: string }
  | { kind: 'claiming' }
  | { kind: 'signed_in_no_access' }
  | { kind: 'signed_in'; tenant_user_id: string; request_id: string };

export default function AuthoringPanel({
  hash,
  onChange,
  onAuthoringChange,
}: {
  hash: string;
  onChange: () => void;
  // Surfaces signed-in authoring state up to TrackingPage so timeline
  // rows can render per-event controls (e.g. the incomplete toggle).
  // Called with `null` whenever the visitor leaves the `signed_in`
  // state.
  onAuthoringChange?: (state: { requestId: string; tenantUserId: string } | null) => void;
}) {
  const supabase = getBrowserSupabase();
  const [state, setState] = useState<AuthState>(supabase ? { kind: 'signed_out' } : { kind: 'disabled' });
  const [emailInput, setEmailInput] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);

  // Mirror the local state up to the parent on every transition.
  useEffect(() => {
    if (!onAuthoringChange) return;
    if (state.kind === 'signed_in') {
      onAuthoringChange({ requestId: state.request_id, tenantUserId: state.tenant_user_id });
    } else {
      onAuthoringChange(null);
    }
  }, [state, onAuthoringChange]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function syncFromSession(session: Session | null) {
      if (!session || !supabase) {
        if (!cancelled) setState({ kind: 'signed_out' });
        return;
      }
      if (!cancelled) setState({ kind: 'claiming' });
      await claimMembership(supabase);
      const membership = await loadMembership(supabase);
      if (cancelled) return;
      if (!membership) {
        setState({ kind: 'signed_in_no_access' });
        return;
      }
      const requestId = await canAuthorOnRequest(supabase, hash);
      if (cancelled) return;
      if (!requestId) {
        setState({ kind: 'signed_in_no_access' });
        return;
      }
      setState({ kind: 'signed_in', tenant_user_id: membership.tenant_user_id, request_id: requestId });
    }

    void supabase.auth.getSession().then(({ data }) => syncFromSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      syncFromSession(session),
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [hash, supabase]);

  if (state.kind === 'disabled') return null;

  if (state.kind === 'signed_in') {
    return (
      <SignedInPanel
        supabase={supabase!}
        requestId={state.request_id}
        tenantUserId={state.tenant_user_id}
        onChange={onChange}
        onSignOut={async () => {
          await supabase!.auth.signOut();
        }}
      />
    );
  }

  if (state.kind === 'signed_in_no_access') {
    return (
      <Panel>
        <p className="text-ink-soft text-sm leading-relaxed">
          You're signed in, but this records request belongs to a different organization.
          Contact the team who shared this URL if you need to add a note.
        </p>
        <button
          type="button"
          className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={() => supabase!.auth.signOut()}
        >
          Sign out
        </button>
      </Panel>
    );
  }

  if (state.kind === 'claiming') {
    return (
      <Panel>
        <p className="font-mono text-sm text-ink-muted">Checking access…</p>
      </Panel>
    );
  }

  if (state.kind === 'sent_link') {
    return (
      <Panel>
        <p className="text-ink-soft text-sm leading-relaxed">
          We sent a sign-in link to <span className="font-mono">{state.email}</span>. Click it
          to come back here with authoring access.
        </p>
      </Panel>
    );
  }

  // signed_out
  if (!showSignIn) {
    return (
      <div className="mt-8 text-right">
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={() => setShowSignIn(true)}
        >
          Sign in to add notes
        </button>
      </div>
    );
  }

  return (
    <Panel>
      <h3 className="font-serif text-lg font-semibold">Sign in to add notes</h3>
      <p className="mt-2 text-ink-soft text-sm leading-relaxed">
        Enter the email you were invited with. We'll email you a one-time sign-in link.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const email = emailInput.trim().toLowerCase();
          if (!email) return;
          const { error } = await supabase!.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.href },
          });
          if (error) {
            // eslint-disable-next-line no-alert
            alert(`Could not send the sign-in link: ${error.message}`);
            return;
          }
          setState({ kind: 'sent_link', email });
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
          className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90"
        >
          Send link
        </button>
      </form>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mt-8 border hairline bg-paper/50 p-6">{children}</div>;
}

function SignedInPanel({
  supabase,
  requestId,
  tenantUserId,
  onChange,
  onSignOut,
}: {
  supabase: SupabaseClient;
  requestId: string;
  tenantUserId: string;
  onChange: () => void;
  onSignOut: () => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <Panel>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg font-semibold">Add a note</h3>
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={() => void onSignOut()}
        >
          Sign out
        </button>
      </div>
      <p className="text-ink-soft text-sm leading-relaxed">
        Notes appear on the public timeline. Don't include patient identifiers.
      </p>
      <form
        className="mt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setLastError(null);
          const result = await addNote(supabase, requestId, tenantUserId, content);
          setSubmitting(false);
          if (!result.ok) {
            setLastError(result.message);
            return;
          }
          setContent('');
          onChange();
        }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Called intake; left a callback for the records coordinator."
          className="w-full border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
        />
        {lastError && (
          <p className="mt-2 text-sm text-seal" role="alert">
            {lastError}
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={submitting || content.trim().length === 0}
            className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </form>
    </Panel>
  );
}
