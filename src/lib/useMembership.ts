// Shared auth + membership hook used by AuthoringPanel and Dashboard.
// Centralizes the "sign in → claim invite → load tenant_users row"
// flow so both surfaces transition consistently.

import { useEffect, useState } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { claimMembership, loadMembership, type MembershipResult } from './authoring';
import { getBrowserSupabase } from './supabase';

export type MembershipState =
  | { kind: 'disabled' }                                  // env vars unset; SPA can't talk to Supabase
  | { kind: 'signed_out' }
  | { kind: 'sent_link'; email: string }
  | { kind: 'claiming' }
  | { kind: 'signed_in_no_access' }
  | { kind: 'signed_in'; membership: MembershipResult };

export interface UseMembership {
  supabase: SupabaseClient | null;
  state: MembershipState;
  sendMagicLink: (email: string, redirectTo?: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signOut: () => Promise<void>;
}

/**
 * On mount: read the current session, claim any pending invites for
 * the user's email, then load the tenant_users row. Updates state
 * across the auth-state machine.
 */
export function useMembership(): UseMembership {
  const supabase = getBrowserSupabase();
  const [state, setState] = useState<MembershipState>(
    supabase ? { kind: 'signed_out' } : { kind: 'disabled' },
  );

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
      setState({ kind: 'signed_in', membership });
    }

    void supabase.auth.getSession().then(({ data }) => syncFromSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      syncFromSession(session),
    );

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function sendMagicLink(
    email: string,
    redirectTo?: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!supabase) return { ok: false, message: 'Auth is not configured.' };
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return { ok: false, message: 'Email is required.' };
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { emailRedirectTo: redirectTo ?? window.location.href },
    });
    if (error) return { ok: false, message: error.message };
    setState({ kind: 'sent_link', email: cleanEmail });
    return { ok: true };
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return { supabase, state, sendMagicLink, signOut };
}
