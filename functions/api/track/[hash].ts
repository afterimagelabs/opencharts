// Cloudflare Pages Function: public read-only timeline for a records
// request, keyed by the request's unguessable public_tracking_hash.
//
// Backs opencharts.org/request/<hash>.
//
// Route: GET /api/track/:hash

import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { buildTimelineForHash } from '../_lib/timeline';

const HASH_RE = /^[A-Za-z0-9_-]{16,32}$/;

export const onRequestGet: PagesFunction<OpenChartsEnv> = async ({ params, env }) => {
  const hash = String(params.hash ?? '');

  if (!HASH_RE.test(hash)) {
    return jsonError(404, 'not_found');
  }

  let timeline;
  try {
    const supabase = getServiceSupabase(env);
    timeline = await buildTimelineForHash(supabase, hash);
  } catch (err) {
    console.error('[track] lookup failed', err);
    return jsonError(500, 'internal_error');
  }

  if (!timeline) {
    return jsonError(404, 'not_found');
  }

  return jsonResponse(timeline);
};
