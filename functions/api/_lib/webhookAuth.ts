import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex, timingSafeEqualHex, tokenPrefix } from './crypto';

export type WebhookService = 'gmail' | 'humblefax' | 'twilio' | 'mailgun';

export interface AuthedWebhook {
  tenant_id: string;
  webhook_secret_id: string;
}

/**
 * Read the webhook secret from the request — tries the header first
 * (the standard pattern; HumbleFax/Mailgun/Gmail can all set custom
 * headers) then falls back to the `s` query param (Twilio webhooks
 * can't set custom headers).
 */
export function readWebhookSecret(request: Request): string | null {
  const header = request.headers.get('X-OpenCharts-Webhook-Secret');
  if (header) return header.trim();
  const url = new URL(request.url);
  const q = url.searchParams.get('s');
  return q ? q.trim() : null;
}

/**
 * Validate the presented secret against the active webhook_secret for
 * the named service. Returns the tenant_id + secret_id on success, or
 * null if no active row matches.
 */
export async function authenticateWebhook(
  supabase: SupabaseClient,
  service: WebhookService,
  presentedSecret: string | null | undefined,
): Promise<AuthedWebhook | null> {
  if (!presentedSecret) return null;
  // Same format as tenant API keys: 64 lowercase hex chars.
  if (presentedSecret.length !== 64 || !/^[0-9a-f]+$/.test(presentedSecret)) return null;

  const prefix = tokenPrefix(presentedSecret);
  const presentedHash = await sha256Hex(presentedSecret);

  const { data, error } = await supabase
    .from('webhook_secrets')
    .select('id, tenant_id, hashed_secret, revoked_at, service')
    .eq('prefix', prefix)
    .eq('service', service)
    .is('revoked_at', null);

  if (error || !data || data.length === 0) return null;

  for (const row of data) {
    if (timingSafeEqualHex(row.hashed_secret, presentedHash)) {
      return { tenant_id: row.tenant_id, webhook_secret_id: row.id };
    }
  }

  return null;
}
