// Twilio voice + SMS status webhook.
//
// Twilio webhooks deliver application/x-www-form-urlencoded bodies and
// can't set arbitrary headers, so the tenant supplies the secret as
// `?s=<secret>` on the configured StatusCallback URL. The hash is
// embedded as a Twilio custom parameter `oc_hash` (set via
// <Parameter name="oc_hash" value="<hash>"/> in TwiML, or in the
// `customParameters` of an outbound REST call).
//
// Route: POST /api/webhooks/twilio
// Auth: ?s=<secret> (X-OpenCharts-Webhook-Secret also accepted)
//
// Voice events become `call` rows; SMS events become `email`-shaped
// rows? No — Twilio SMS doesn't make sense as `call` either. Skip SMS
// for now; only voice events are logged. (Tenants that want SMS can
// log via the POST /api/v1/requests/:id/events tenant API.)

import { insertWebhookEvent } from '../_lib/eventInsert';
import { isValidHash } from '../_lib/hashExtract';
import { jsonError, jsonResponse } from '../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../_lib/webhookAuth';

// We accept either form-encoded (Twilio's default) or JSON (for
// integrations that wrap Twilio).
async function parseTwilioBody(request: Request): Promise<Record<string, string> | null> {
  const ct = request.headers.get('Content-Type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const j = await request.json();
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
        if (v !== null && v !== undefined) out[k] = String(v);
      }
      return out;
    } catch {
      return null;
    }
  }
  // form-encoded — Twilio's default.
  try {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const out: Record<string, string> = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'twilio', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  const body = await parseTwilioBody(request);
  if (!body) return jsonError(400, 'bad_request', 'Could not parse Twilio payload.');

  // We only care about completed/terminal voice events. Twilio fires
  // StatusCallback with `CallStatus` in (queued, ringing, in-progress,
  // completed, busy, failed, no-answer, canceled). We log the call
  // only once it reaches a terminal state.
  const callStatus = body.CallStatus;
  if (!callStatus || ['queued', 'ringing', 'in-progress'].includes(callStatus)) {
    return jsonResponse({ ok: true, ignored: true, reason: callStatus ?? 'no_status' });
  }

  // MessageStatus would be present for SMS callbacks; we don't model
  // SMS in PR #2.
  if (body.MessageStatus && !callStatus) {
    return jsonResponse({ ok: true, ignored: true, reason: 'sms_not_modeled' });
  }

  // Custom parameters surface on the StatusCallback as fields named
  // exactly as they were declared in TwiML. We named ours `oc_hash`.
  const hash = body.oc_hash;
  if (!isValidHash(hash)) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_oc_hash' });
  }

  // Twilio passes a Timestamp header on StatusCallback OR you can use
  // a body field if present. Default to now() when neither is given.
  const occurredAt =
    body.Timestamp ?? request.headers.get('X-Twilio-Timestamp') ?? new Date().toISOString();
  const occurredIso = Number.isNaN(new Date(occurredAt).getTime())
    ? new Date().toISOString()
    : new Date(occurredAt).toISOString();

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash,
    type: 'call',
    source: 'webhook:twilio',
    occurred_at: occurredIso,
    external_id: body.CallSid ?? null,
    metadata: {
      call_status: callStatus,
      direction: body.Direction ?? null,
      from: body.From ?? null,
      to: body.To ?? null,
      duration: body.CallDuration ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[twilio] insert failed', result);
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
