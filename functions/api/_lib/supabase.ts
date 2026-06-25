import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface OpenChartsEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  // Optional override for the public toolkit base URL used when we
  // hand webhook URLs back to a tenant. Defaults to the request's own
  // origin if not set.
  PUBLIC_BASE_URL?: string;
}

/**
 * Service-role Supabase client for use inside Pages Functions. RLS is
 * bypassed — every handler that uses this must enforce its own auth
 * before reading or writing.
 */
export function getServiceSupabase(env: OpenChartsEnv): SupabaseClient {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
