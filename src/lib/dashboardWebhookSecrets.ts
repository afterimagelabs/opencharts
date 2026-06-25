// Dashboard webhook secret management.
//
// Reads via RLS-scoped direct Supabase; mints + revokes through the
// dual-auth tenant API endpoints so the server can do the SHA-256
// hashing and the one-shot plaintext surfacing.

import type { SupabaseClient } from '@supabase/supabase-js';

export type WebhookService = 'gmail' | 'humblefax' | 'twilio' | 'mailgun';

export const WEBHOOK_SERVICES: WebhookService[] = ['humblefax', 'twilio', 'mailgun', 'gmail'];

export interface WebhookSecretRow {
  id: string;
  service: WebhookService;
  prefix: string;
  created_at: string;
  revoked_at: string | null;
}

export interface MintedWebhookSecret {
  id: string;
  service: WebhookService;
  prefix: string;
  created_at: string;
  secret: string;
}

async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('Not signed in.');
  return { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}

export async function listWebhookSecrets(
  supabase: SupabaseClient,
): Promise<{ ok: true; secrets: WebhookSecretRow[] } | { ok: false; message: string }> {
  const { data, error } = await supabase
    .from('webhook_secrets')
    .select('id, service, prefix, created_at, revoked_at')
    .order('created_at', { ascending: false });
  if (error) return { ok: false, message: error.message };
  return { ok: true, secrets: (data ?? []) as WebhookSecretRow[] };
}

export async function mintWebhookSecret(
  supabase: SupabaseClient,
  service: WebhookService,
): Promise<{ ok: true; secret: MintedWebhookSecret } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch('/api/v1/webhook-secrets', {
      method: 'POST',
      headers,
      body: JSON.stringify({ service }),
    });
    const body = (await res.json().catch(() => ({}))) as { secret?: string; message?: string };
    if (!res.ok) return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    return { ok: true, secret: body as MintedWebhookSecret };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

export async function revokeWebhookSecret(
  supabase: SupabaseClient,
  id: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const headers = await authHeader(supabase);
    const res = await fetch(`/api/v1/webhook-secrets/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      return { ok: false, message: body.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Group secrets by service. Returns the most-recent active secret (if
 * any) and the historical (revoked) ones per service so the UI can
 * render a per-service card.
 */
export interface ServiceGroup {
  service: WebhookService;
  active: WebhookSecretRow | null;
  revoked: WebhookSecretRow[];
}

export function groupByService(rows: WebhookSecretRow[]): ServiceGroup[] {
  const byService = new Map<WebhookService, WebhookSecretRow[]>();
  for (const r of rows) {
    if (!byService.has(r.service)) byService.set(r.service, []);
    byService.get(r.service)!.push(r);
  }
  return WEBHOOK_SERVICES.map((service) => {
    const rowsForService = byService.get(service) ?? [];
    const active = rowsForService.find((r) => r.revoked_at === null) ?? null;
    const revoked = rowsForService.filter((r) => r.revoked_at !== null);
    return { service, active, revoked };
  });
}
