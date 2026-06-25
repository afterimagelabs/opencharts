// Magic-link sign-in + note authoring UI for tenant members.
//
// Wraps the shared `useMembership` hook (same flow used by the
// dashboard) and layers the per-request access check + note-author
// form on top. Renders nothing when the SPA isn't configured for
// Supabase, so it's safe to mount on every request page.

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useMembership } from '../lib/useMembership';
import { addNote, canAuthorOnRequest } from '../lib/authoring';

type AccessState =
  | { kind: 'checking' }
  | { kind: 'no_access' }
  | { kind: 'ready'; request_id: string };

export default function AuthoringPanel({
  hash,
  onChange,
  onAuthoringChange,
}: {
  hash: string;
  onChange: () => void;
  // Surfaces signed-in authoring state up to TrackingPage so timeline
  // rows can render per-event controls (e.g. the incomplete toggle).
  // Called with `null` whenever the visitor isn't actively authorized
  // on THIS request.
  onAuthoringChange?: (state: { requestId: string; tenantUserId: string } | null) => void;
}) {
  const { supabase, state, sendMagicLink, signOut } = useMembership();
  const [emailInput, setEmailInput] = useState('');
  const [showSignIn, setShowSignIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // useMembership doesn't know which request the user is looking at,
  // so we layer the per-request access check on top of its
  // `signed_in` state. RLS gives back the request row only if the
  // user's tenant owns it; we mirror that into a local state machine.
  const [access, setAccess] = useState<AccessState>({ kind: 'checking' });

  useEffect(() => {
    let cancelled = false;
    if (state.kind !== 'signed_in' || !supabase) {
      setAccess({ kind: 'checking' });
      return;
    }
    setAccess({ kind: 'checking' });
    void canAuthorOnRequest(supabase, hash).then((requestId) => {
      if (cancelled) return;
      setAccess(requestId ? { kind: 'ready', request_id: requestId } : { kind: 'no_access' });
    });
    return () => {
      cancelled = true;
    };
  }, [state.kind, supabase, hash]);

  // Surface the (requestId, tenantUserId) tuple upward only when the
  // visitor is genuinely authorized on THIS request.
  useEffect(() => {
    if (!onAuthoringChange) return;
    if (state.kind === 'signed_in' && access.kind === 'ready') {
      onAuthoringChange({
        requestId: access.request_id,
        tenantUserId: state.membership.tenant_user_id,
      });
    } else {
      onAuthoringChange(null);
    }
  }, [state, access, onAuthoringChange]);

  if (state.kind === 'disabled') return null;

  if (state.kind === 'signed_in' && access.kind === 'ready' && supabase) {
    return (
      <SignedInPanel
        supabase={supabase}
        requestId={access.request_id}
        tenantUserId={state.membership.tenant_user_id}
        onChange={onChange}
        onSignOut={() => void signOut()}
      />
    );
  }

  if (state.kind === 'signed_in' && access.kind === 'no_access') {
    return (
      <Panel>
        <p className="text-ink-soft text-sm leading-relaxed">
          You're signed in, but this records request belongs to a different organization.
          Contact the team who shared this URL if you need to add a note.
        </p>
        <button
          type="button"
          className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </Panel>
    );
  }

  if (state.kind === 'signed_in_no_access') {
    return (
      <Panel>
        <p className="text-ink-soft text-sm leading-relaxed">
          You're signed in, but you don't belong to a tenant yet. Ask the team who
          invited you to confirm the invite is on file.
        </p>
        <button
          type="button"
          className="mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </Panel>
    );
  }

  if (state.kind === 'claiming' || (state.kind === 'signed_in' && access.kind === 'checking')) {
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
          We sent a sign-in link to <span className="font-mono">{state.email}</span>. Click
          it to come back here with authoring access.
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
          setErrorMsg(null);
          const r = await sendMagicLink(emailInput);
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
          className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90"
        >
          Send link
        </button>
      </form>
      {errorMsg && (
        <p className="mt-2 text-sm text-seal" role="alert">
          {errorMsg}
        </p>
      )}
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
  onSignOut: () => void;
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
          onClick={onSignOut}
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
