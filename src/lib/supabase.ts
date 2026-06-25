// Anon-key Supabase client used by the SPA. Talks directly to the
// OpenCharts Supabase project; RLS does the gatekeeping.
//
// Both env vars must be set at build time (Vite injects them):
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//
// In production these come from the Cloudflare Pages project's
// environment variables (set both Production and Preview). Locally,
// drop them in a .env.local file in the opencharts root.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    // Surface a console warning once. The authoring UI hides itself
    // gracefully when this returns null, so the public page still
    // renders without these set.
    if (typeof console !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[opencharts] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set — authoring UI disabled.',
      );
    }
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return cached;
}
