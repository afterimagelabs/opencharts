// Mailgun inbound-route webhook with native signature verification.
//
// Mailgun inbound routes deliver multipart/form-data with the token /
// timestamp / signature triple as form fields (not nested under
// `signature` like the event webhook). The hash arrives in the
// recipient/To/Reply-To via the `records+<hash>@` convention.
//
// Route: POST /api/webhooks/mailgun/:tenant_id/inbound

import { insertWebhookEvent } from '../../../_lib/eventInsert';
import { extractHashFromAddressList, extractHashFromEmailAddress } from '../../../_lib/hashExtract';
import { verifyMailgunSignature } from '../../../_lib/mailgunSig';
import { jsonError, jsonResponse } from '../../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../../_lib/supabase';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MailgunInboundPayload {
  token?: string;
  timestamp?: string;
  signature?: string;
  recipient?: string;
  sender?: string;
  from?: string;
  To?: string;
  'Reply-To'?: string;
  'Message-Id'?: string;
  subject?: string;
  to?: string[];
  reply_to?: string;
}

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
    console.error('[mailgun native inbound] credential lookup failed', credErr);
    return jsonError(500, 'internal_error');
  }
  if (!cred) {
    return jsonError(401, 'unauthorized', 'No Mailgun credential configured for this tenant.');
  }
  const signingKey = (cred.credential as { signing_key?: string } | null)?.signing_key;
  if (typeof signingKey !== 'string' || signingKey.length === 0) {
    return jsonError(500, 'internal_error');
  }

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

  const verifyResult = await verifyMailgunSignature(signingKey, {
    timestamp: body.timestamp,
    token: body.token,
    signature: body.signature,
  });
  if (!verifyResult.ok) {
    return jsonError(401, 'unauthorized', `Signature did not verify: ${verifyResult.reason}`);
  }

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

  const occurredAt = new Date().toISOString();

  const result = await insertWebhookEvent(supabase, {
    tenant_id: tenantId,
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
      auth: 'native_sig',
    },
  });

  if (!result.ok) {
    if (result.reason === 'unknown_request' || result.reason === 'tenant_mismatch') {
      return jsonResponse({ ok: true, matched: false, reason: 'unknown_hash' });
    }
    if (result.reason === 'invalid_hash') return jsonError(400, 'bad_request', 'Invalid hash.');
    console.error('[mailgun native inbound] insert failed', result);
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
