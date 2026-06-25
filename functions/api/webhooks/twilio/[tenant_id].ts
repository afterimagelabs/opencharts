// Twilio webhook with native X-Twilio-Signature verification.
//
// Tenants who want stronger auth than the shared-secret pattern point
// Twilio at this URL (it includes their tenant_id) and configure their
// Twilio Auth Token via PUT /api/v1/native-creds/twilio. We verify the
// incoming X-Twilio-Signature using HMAC-SHA1 over the canonical Twilio
// signed-string. No shared secret required.
//
// Route: POST /api/webhooks/twilio/:tenant_id
//
// The shared-secret path at /api/webhooks/twilio is preserved
// untouched for tenants who haven't migrated to native sig.

import { insertWebhookEvent } from '../../_lib/eventInsert';
import { isValidHash } from '../../_lib/hashExtract';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';
import { verifyTwilioFormSignature } from '../../_lib/twilioSig';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function parseFormBody(request: Request): Promise<Record<string, string> | null> {
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

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, params, request }) => {
  const tenantId = String(params.tenant_id ?? '');
  if (!UUID_RE.test(tenantId)) return jsonError(404, 'not_found');

  const supabase = getServiceSupabase(env);

  // Look up the tenant's Twilio auth_token. Service-role bypasses RLS.
  const { data: cred, error: credErr } = await supabase
    .from('tenant_native_creds')
    .select('credential')
    .eq('tenant_id', tenantId)
    .eq('service', 'twilio')
    .maybeSingle();

  if (credErr) {
    console.error('[twilio native] credential lookup failed', credErr);
    return jsonError(500, 'internal_error');
  }
  if (!cred) return jsonError(401, 'unauthorized', 'No Twilio credential configured for this tenant.');

  const authToken = (cred.credential as { auth_token?: string } | null)?.auth_token;
  if (typeof authToken !== 'string' || authToken.length === 0) {
    return jsonError(500, 'internal_error');
  }

  // Twilio webhook bodies are form-encoded.
  const body = await parseFormBody(request);
  if (!body) return jsonError(400, 'bad_request', 'Could not parse Twilio payload.');

  const presented = request.headers.get('X-Twilio-Signature');
  const ok = await verifyTwilioFormSignature(authToken, request.url, body, presented);
  if (!ok) return jsonError(401, 'unauthorized', 'X-Twilio-Signature did not verify.');

  // We only log terminal voice statuses; ringing/in-progress are
  // intermediate.
  const callStatus = body.CallStatus;
  if (!callStatus || ['queued', 'ringing', 'in-progress'].includes(callStatus)) {
    return jsonResponse({ ok: true, ignored: true, reason: callStatus ?? 'no_status' });
  }
  if (body.MessageStatus && !callStatus) {
    return jsonResponse({ ok: true, ignored: true, reason: 'sms_not_modeled' });
  }

  const hash = body.oc_hash;
  if (!isValidHash(hash)) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_oc_hash' });
  }

  const occurredAt =
    body.Timestamp ?? request.headers.get('X-Twilio-Timestamp') ?? new Date().toISOString();
  const occurredIso = Number.isNaN(new Date(occurredAt).getTime())
    ? new Date().toISOString()
    : new Date(occurredAt).toISOString();

  const result = await insertWebhookEvent(supabase, {
    tenant_id: tenantId,
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
      auth: 'native_sig',
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[twilio native] insert failed', result);
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
