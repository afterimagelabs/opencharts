// Mailgun "delivered" webhook for outbound email.
//
// Tenants send emails through Mailgun with a custom variable
// `v:oc_hash=<hash>`. Mailgun forwards us delivery events; we look up
// the hash and log an `email` event on the request.
//
// Route: POST /api/webhooks/mailgun
// Auth: X-OpenCharts-Webhook-Secret header (or ?s=<secret>)
//
// Mailgun's native HMAC signature verification could replace the
// shared-secret pattern; we'd then accept their token/timestamp/sig
// triplet and verify with the tenant's Mailgun signing key. Out of
// scope for v1.

import { insertWebhookEvent } from '../_lib/eventInsert';
import { isValidHash } from '../_lib/hashExtract';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../_lib/webhookAuth';

interface MailgunEventPayload {
  signature?: { token?: string; timestamp?: string; signature?: string };
  'event-data'?: {
    event?: string;
    timestamp?: number;
    'user-variables'?: Record<string, string>;
    message?: { headers?: { 'message-id'?: string; to?: string; from?: string; subject?: string } };
    recipient?: string;
  };
}

const TERMINAL_DELIVERY_EVENTS = new Set(['delivered', 'accepted']);

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'mailgun', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  let body: MailgunEventPayload;
  try {
    body = (await request.json()) as MailgunEventPayload;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  const evt = body['event-data'];
  if (!evt) return jsonResponse({ ok: true, ignored: true, reason: 'no_event_data' });

  if (!TERMINAL_DELIVERY_EVENTS.has(evt.event ?? '')) {
    return jsonResponse({ ok: true, ignored: true, reason: `event:${evt.event}` });
  }

  const hash = evt['user-variables']?.oc_hash;
  if (!isValidHash(hash)) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_oc_hash' });
  }

  const occurredAt =
    typeof evt.timestamp === 'number'
      ? new Date(evt.timestamp * 1000).toISOString()
      : new Date().toISOString();

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash,
    type: 'email',
    source: 'webhook:mailgun',
    occurred_at: occurredAt,
    external_id: evt.message?.headers?.['message-id'] ?? null,
    metadata: {
      event: evt.event,
      recipient: evt.recipient ?? null,
      from: evt.message?.headers?.from ?? null,
      to: evt.message?.headers?.to ?? null,
      subject: evt.message?.headers?.subject ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[mailgun] insert failed', result);
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
