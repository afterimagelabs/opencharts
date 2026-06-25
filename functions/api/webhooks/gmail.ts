// Gmail forwarded-message webhook.
//
// Gmail itself doesn't have a hosted webhook product — its native push
// path goes through GCP Pub/Sub, which requires per-tenant OAuth +
// historyId polling that's out of scope for a multi-tenant SaaS at
// this stage.
//
// Instead, this endpoint accepts a small normalized JSON shape that a
// tenant can produce with a Google Apps Script trigger on an inbox
// filter (we'll publish a sample script in CLAUDE.md). The Apps
// Script POSTs:
//
//   {
//     "from": "office@providerco.com",
//     "to": ["records+abc123XYZ@tenantdomain.com"],
//     "subject": "Re: Medical records request",
//     "occurred_at": "2026-06-24T12:00:00Z",
//     "external_id": "gmail-thread-or-message-id",
//     "direction": "inbound" | "outbound"   // optional
//   }
//
// Route: POST /api/webhooks/gmail
// Auth: X-OpenCharts-Webhook-Secret header (or ?s=<secret>)

import { insertWebhookEvent } from '../_lib/eventInsert';
import { extractHashFromAddressList, extractHashFromEmailAddress } from '../_lib/hashExtract';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../_lib/webhookAuth';

interface GmailForwardPayload {
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  reply_to?: string;
  subject?: string;
  occurred_at?: string;
  external_id?: string;
  direction?: 'inbound' | 'outbound';
}

function toArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'gmail', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  let body: GmailForwardPayload;
  try {
    body = (await request.json()) as GmailForwardPayload;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  // Hash hunt order: To addresses (covers outbound copies where we
  // sent FROM records+<hash>@), Reply-To (covers provider replies that
  // include our address in Reply-To), From (covers the case where a
  // provider replied directly to records+<hash>@).
  const hash =
    extractHashFromAddressList([
      ...toArray(body.to),
      ...toArray(body.cc),
      body.reply_to,
      body.from,
    ]) ??
    extractHashFromEmailAddress(body.from);

  if (!hash) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_hash_in_addresses' });
  }

  const occurredAt = body.occurred_at ?? new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return jsonError(400, 'bad_request', 'occurred_at must be a parseable ISO timestamp.');
  }

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash,
    type: 'email',
    source: 'webhook:gmail',
    occurred_at: occurredAt,
    external_id: body.external_id ?? null,
    metadata: {
      direction: body.direction ?? null,
      from: body.from ?? null,
      to: toArray(body.to),
      subject: body.subject ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[gmail] insert failed', result);
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
