// Mailgun "delivered" / "accepted" webhook with native signature
// verification.
//
// Tenants point Mailgun at /api/webhooks/mailgun/:tenant_id and we
// verify body.signature against the tenant's stored signing_key
// (PUT via /api/v1/native-creds/mailgun) before we trust the payload.
//
// Route: POST /api/webhooks/mailgun/:tenant_id

import { insertWebhookEvent } from '../../_lib/eventInsert';
import { isValidHash } from '../../_lib/hashExtract';
import { verifyMailgunSignature } from '../../_lib/mailgunSig';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, params, request }) => {
  const tenantId = String(params.tenant_id ?? '');
  if (!UUID_RE.test(tenantId)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);

  const { data: cred, error: credErr } = await supabase
    .from('tenant_native_creds')
    .select('credential')
    .eq('tenant_id', tenantId)
    .eq('service', 'mailgun')
    .maybeSingle();

  if (credErr) {
    console.error('[mailgun native] credential lookup failed', credErr);
    return jsonError(500, 'internal_error');
  }
  if (!cred) {
    return jsonError(401, 'unauthorized', 'No Mailgun credential configured for this tenant.');
  }
  const signingKey = (cred.credential as { signing_key?: string } | null)?.signing_key;
  if (typeof signingKey !== 'string' || signingKey.length === 0) {
    return jsonError(500, 'internal_error');
  }

  let body: MailgunEventPayload;
  try {
    body = (await request.json()) as MailgunEventPayload;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  const verifyResult = await verifyMailgunSignature(signingKey, {
    timestamp: body.signature?.timestamp,
    token: body.signature?.token,
    signature: body.signature?.signature,
  });
  if (!verifyResult.ok) {
    return jsonError(401, 'unauthorized', `Signature did not verify: ${verifyResult.reason}`);
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
    tenant_id: tenantId,
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
      auth: 'native_sig',
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[mailgun native] insert failed', result);
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
