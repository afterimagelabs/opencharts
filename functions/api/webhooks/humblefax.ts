// HumbleFax "fax sent" status webhook.
//
// Tenants put `oc:<hash>` in HumbleFax's referenceId when sending a
// fax. When HumbleFax fires the SentFax.SendComplete callback, we
// look up the hash → request → tenant and log a `fax` event.
//
// Route: POST /api/webhooks/humblefax
// Auth: X-OpenCharts-Webhook-Secret header (or ?s=<secret>)

import { insertWebhookEvent } from '../_lib/eventInsert';
import { extractHashFromOcToken } from '../_lib/hashExtract';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../_lib/webhookAuth';

interface HumbleFaxSentPayload {
  type?: string;                  // 'SentFax.SendComplete'
  faxId?: string;
  referenceId?: string;           // tenant-supplied free-text — we look for 'oc:<hash>'
  completionTime?: string;        // ISO timestamp
  status?: string;                // 'success' | 'partial' | 'failed'
  pagesSent?: number;
  successes?: number;
  failures?: number;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'humblefax', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  let body: HumbleFaxSentPayload;
  try {
    body = (await request.json()) as HumbleFaxSentPayload;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  if (body.type && body.type !== 'SentFax.SendComplete') {
    // Some other HumbleFax event we don't model yet. ACK so HumbleFax
    // doesn't retry.
    return jsonResponse({ ok: true, ignored: body.type });
  }

  const hash = extractHashFromOcToken(body.referenceId);
  if (!hash) {
    // Not one of ours — could be a fax sent through the same HumbleFax
    // account by another system. ACK and move on.
    return jsonResponse({ ok: true, matched: false, reason: 'no_oc_token' });
  }

  const occurredAt = body.completionTime ?? new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return jsonError(400, 'bad_request', 'completionTime must be a parseable ISO timestamp.');
  }

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash,
    type: 'fax',
    source: 'webhook:humblefax',
    occurred_at: occurredAt,
    external_id: body.faxId ?? null,
    metadata: {
      humblefax_status: body.status ?? null,
      pages_sent: body.pagesSent ?? null,
      successes: body.successes ?? null,
      failures: body.failures ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[humblefax] insert failed', result);
    return jsonError(500, 'internal_error');
  }

  return jsonResponse({
    ok: true,
    matched: true,
    deduped: result.deduped,
    request_id: result.request_id,
    event_id: result.event_id,
  });
};
