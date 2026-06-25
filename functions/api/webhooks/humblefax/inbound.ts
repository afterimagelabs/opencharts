// HumbleFax inbound-fax webhook.
//
// HumbleFax delivers any fax sent to a tenant's number to this URL. We
// don't have an oc:<hash> token here (the sender — a provider's office
// — has no idea what OpenCharts is). Instead, we match the inbound
// fax's sender number against the tenant's open requests by
// provider_fax. The most recently-created open request (records_received_at
// is null) wins. If no match, we record nothing — the tenant can wire
// up a separate inbound-fax workflow that does ML/OCR matching, but
// that's out of scope here.
//
// Route: POST /api/webhooks/humblefax/inbound
// Auth: X-OpenCharts-Webhook-Secret header (or ?s=<secret>)

import { insertWebhookEvent } from '../../_lib/eventInsert';
import { jsonError, jsonResponse } from '../../_lib/responses';
import { getServiceSupabase, type OpenChartsEnv } from '../../_lib/supabase';
import { authenticateWebhook, readWebhookSecret } from '../../_lib/webhookAuth';

interface HumbleFaxInboundPayload {
  faxId?: string;
  fromNumber?: string;
  toNumber?: string;
  receivedAt?: string;
  pages?: number;
  pdfUrl?: string;
}

/**
 * Normalize a phone/fax number to digits-only for matching. HumbleFax
 * sometimes delivers `+15551234567`, sometimes `(555) 123-4567`. We
 * compare on digits to avoid false negatives.
 */
function normalizeNumber(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;
  // Drop a leading 1 if the result is 11 digits (US country code).
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

export const onRequestPost: PagesFunction<OpenChartsEnv> = async ({ env, request }) => {
  const supabase = getServiceSupabase(env);
  const authed = await authenticateWebhook(supabase, 'humblefax', readWebhookSecret(request));
  if (!authed) return jsonError(401, 'unauthorized');

  let body: HumbleFaxInboundPayload;
  try {
    body = (await request.json()) as HumbleFaxInboundPayload;
  } catch {
    return jsonError(400, 'bad_request', 'Body must be valid JSON.');
  }

  const fromDigits = normalizeNumber(body.fromNumber);
  if (!fromDigits) {
    // No sender number — can't match. ACK so HumbleFax doesn't retry.
    return jsonResponse({ ok: true, matched: false, reason: 'no_sender_number' });
  }

  // Find the tenant's most-recent OPEN request whose provider_fax
  // matches. We pull a small batch and normalize on the JS side
  // because the stored numbers might still have formatting.
  const { data: candidates, error: candidatesErr } = await supabase
    .from('requests')
    .select('id, public_tracking_hash, provider_fax, records_received_at, created_at')
    .eq('tenant_id', authed.tenant_id)
    .is('records_received_at', null)
    .not('provider_fax', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (candidatesErr) {
    console.error('[humblefax/inbound] candidate lookup failed', candidatesErr);
    return jsonError(500, 'internal_error');
  }

  const match = (candidates ?? []).find((c) => normalizeNumber(c.provider_fax) === fromDigits);
  if (!match) {
    return jsonResponse({ ok: true, matched: false, reason: 'no_provider_match' });
  }

  const occurredAt = body.receivedAt ?? new Date().toISOString();
  if (Number.isNaN(new Date(occurredAt).getTime())) {
    return jsonError(400, 'bad_request', 'receivedAt must be a parseable ISO timestamp.');
  }

  const result = await insertWebhookEvent(supabase, {
    tenant_id: authed.tenant_id,
    hash: match.public_tracking_hash,
    type: 'records_received',
    source: 'webhook:humblefax_inbound',
    occurred_at: occurredAt,
    external_id: body.faxId ?? null,
    metadata: {
      from_number: body.fromNumber ?? null,
      to_number: body.toNumber ?? null,
      pages: body.pages ?? null,
      pdf_url: body.pdfUrl ?? null,
    },
  });

  if (!result.ok) {
    if (result.reason === 'invalid_hash') return jsonError(500, 'internal_error');
    console.error('[humblefax/inbound] insert failed', result);
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
