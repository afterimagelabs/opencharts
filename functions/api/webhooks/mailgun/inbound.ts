// Mailgun inbound-route webhook — fires when a provider replies to
// an email the tenant sent via Mailgun routes.
//
// The hash arrives in the To/Reply-To header as `records+<hash>@...`,
// matching the convention CMS already uses for its records mailbox.
//
// Route: POST /api/webhooks/mailgun/inbound
// Auth: X-OpenCharts-Webhook-Secret header (or ?s=<secret>)

import { insertWebhookEvent } from '../../_lib/eventInsert';
import { extractHashFromAddressList, extractHashFromEmailAddress } from '../../_lib/hashExtract';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../../_lib/webhookAuth';

interface MailgunInboundPayload {
  // Mailgun's "store" / "forward" routes deliver these fields. We use
  // a permissive shape because tenants may transform the payload before
  // it reaches us.
  recipient?: string;
  sender?: string;
  from?: string;
  To?: string;
  'Reply-To'?: string;
  'Message-Id'?: string;
  subject?: string;
  timestamp?: number;
  // some integrations parse and pass these:
  to?: string[];
  reply_to?: string;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'mailgun', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  // Mailgun's inbound webhook posts multipart/form-data by default.
  // We accept JSON too (tenants frequently wrap).
  let body: MailgunInboundPayload = {};
  const ct = request.headers.get('Content-Type') ?? '';
  try {
    if (ct.includes('application/json')) {
      body = (await request.json()) as MailgunInboundPayload;
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) {
        (body as Record<string, unknown>)[k] = typeof v === 'string' ? v : v.name;
      }
    }
  } catch {
    return jsonError(400, 'bad_request', 'Could not parse body.');
  }

  // Inspect every address-like field for `records+<hash>@`. Some
  // tenants will only have it in the `recipient` field; others will
  // see it in the parsed To array.
  const recipientAddresses: Array<string | null | undefined> = [
    body.recipient,
    body.To,
    body['Reply-To'],
    body.reply_to,
    ...(Array.isArray(body.to) ? body.to : []),
  ];

  const hash =
    extractHashFromAddressList(recipientAddresses) ??
    extractHashFromEmailAddress(typeof body.recipient === 'string' ? body.recipient : null);

  if (!hash) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_hash_in_recipients' });
  }

  const occurredAt =
    typeof body.timestamp === 'number'
      ? new Date(body.timestamp * 1000).toISOString()
      : new Date().toISOString();

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash,
    type: 'email',
    source: 'webhook:mailgun',
    occurred_at: occurredAt,
    external_id: body['Message-Id'] ?? null,
    metadata: {
      direction: 'inbound',
      from: body.from ?? body.sender ?? null,
      to: body.recipient ?? body.To ?? null,
      subject: body.subject ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[mailgun/inbound] insert failed', result);
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
