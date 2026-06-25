// /dashboard/webhook-secrets — per-service secret cards.
//
// One card per supported service (humblefax / twilio / mailgun /
// gmail). Each card shows the current active secret prefix (or "no
// secret yet") and a button to mint a new one — minting auto-revokes
// the previous active secret for that service.

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  groupByService,
  listWebhookSecrets,
  mintWebhookSecret,
  revokeWebhookSecret,
  WEBHOOK_SERVICES,
  type MintedWebhookSecret,
  type ServiceGroup,
  type WebhookService,
} from '../lib/dashboardWebhookSecrets';

const SERVICE_LABEL: Record<WebhookService, string> = {
  humblefax: 'HumbleFax',
  twilio: 'Twilio',
  mailgun: 'Mailgun',
  gmail: 'Gmail (Apps Script)',
};

const SERVICE_HINT: Record<WebhookService, string> = {
  humblefax:
    'Configure your HumbleFax webhook URLs with this secret in the X-OpenCharts-Webhook-Secret header.',
  twilio:
    'Append ?s=<secret> to your Twilio webhook URL (custom headers aren’t supported on Twilio callbacks).',
  mailgun:
    'Send this in the X-OpenCharts-Webhook-Secret header on your Mailgun routes / event webhooks.',
  gmail:
    'Set this in Script Properties as OC_WEBHOOK_SECRET, then your Apps Script trigger posts it as a header.',
};

export default function DashboardWebhookSecrets({ supabase }: { supabase: SupabaseClient }) {
  type State =
    | { kind: 'loading' }
    | { kind: 'ok'; groups: ServiceGroup[] }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [revealed, setRevealed] = useState<MintedWebhookSecret | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [working, setWorking] = useState<WebhookService | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await listWebhookSecrets(supabase);
      if (cancelled) return;
      if (!r.ok) setState({ kind: 'error', message: r.message });
      else setState({ kind: 'ok', groups: groupByService(r.secrets) });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, reloadKey]);

  async function onMint(service: WebhookService) {
    if (
      // eslint-disable-next-line no-alert
      !window.confirm(
        `Minting a new ${SERVICE_LABEL[service]} secret will automatically revoke the existing active one. Continue?`,
      )
    ) {
      return;
    }
    setWorking(service);
    const r = await mintWebhookSecret(supabase, service);
    setWorking(null);
    if (!r.ok) {
      // eslint-disable-next-line no-alert
      alert(`Could not mint: ${r.message}`);
      return;
    }
    setRevealed(r.secret);
    setReloadKey((n) => n + 1);
  }

  async function onRevoke(id: string) {
    const r = await revokeWebhookSecret(supabase, id);
    if (!r.ok) {
      // eslint-disable-next-line no-alert
      alert(`Could not revoke: ${r.message}`);
      return;
    }
    setReloadKey((n) => n + 1);
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold mb-1">Webhook secrets</h2>
      <p className="text-ink-soft text-sm leading-relaxed mb-6">
        One secret per service. Provider callbacks (HumbleFax / Twilio / Mailgun / Gmail
        Apps Script) authenticate with these. Plaintext is shown once at creation.
      </p>

      {revealed && <RevealedSecret secret={revealed} onDismiss={() => setRevealed(null)} />}

      {state.kind === 'loading' && (
        <p className="font-mono text-sm text-ink-muted">Loading secrets…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-seal" role="alert">
          Could not load secrets: {state.message}
        </p>
      )}
      {state.kind === 'ok' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {WEBHOOK_SERVICES.map((service) => {
            const group = state.groups.find((g) => g.service === service)!;
            return (
              <ServiceCard
                key={service}
                group={group}
                busy={working === service}
                onMint={() => void onMint(service)}
                onRevoke={(id) => void onRevoke(id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  group,
  busy,
  onMint,
  onRevoke,
}: {
  group: ServiceGroup;
  busy: boolean;
  onMint: () => void;
  onRevoke: (id: string) => void;
}) {
  const label = SERVICE_LABEL[group.service];
  return (
    <div className="border hairline bg-paper/50 p-5">
      <h3 className="font-serif text-lg font-semibold">{label}</h3>
      <p className="text-ink-soft text-[13px] leading-relaxed mt-1">
        {SERVICE_HINT[group.service]}
      </p>

      <div className="mt-4">
        {group.active ? (
          <div className="flex items-center justify-between font-mono text-[13px]">
            <div>
              <div className="text-ink-muted text-[11px] uppercase tracking-[0.18em] mb-1">
                Active secret · prefix
              </div>
              <div className="text-ink">{group.active.prefix}…</div>
            </div>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-seal hover:underline"
              onClick={() => onRevoke(group.active!.id)}
            >
              Revoke
            </button>
          </div>
        ) : (
          <p className="font-mono text-[13px] text-ink-muted">No secret yet.</p>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        className="mt-4 px-3 py-2 bg-ink text-paper text-[11px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
        onClick={onMint}
      >
        {busy ? 'Generating…' : group.active ? 'Rotate secret' : 'Generate secret'}
      </button>

      {group.revoked.length > 0 && (
        <details className="mt-4 text-[12px] text-ink-muted">
          <summary className="cursor-pointer">{group.revoked.length} revoked</summary>
          <ul className="mt-2 space-y-1 font-mono">
            {group.revoked.map((r) => (
              <li key={r.id}>
                {r.prefix}… · revoked {fmtShortDate(r.revoked_at!)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RevealedSecret({
  secret,
  onDismiss,
}: {
  secret: MintedWebhookSecret;
  onDismiss: () => void;
}) {
  return (
    <div className="border-2 border-seal bg-paper-warm/30 p-6 mb-6">
      <h3 className="font-serif text-lg font-semibold text-seal mb-1">
        Copy this secret now — it won't be shown again
      </h3>
      <p className="text-ink-soft text-sm leading-relaxed mb-3">
        <span className="font-mono">{SERVICE_LABEL[secret.service]}</span> ·{' '}
        <span className="text-ink-muted">prefix {secret.prefix}</span>
      </p>
      <code className="block break-all bg-ink/5 border hairline px-3 py-2 font-mono text-[13px] mb-3">
        {secret.secret}
      </code>
      <button
        type="button"
        className="text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
        onClick={onDismiss}
      >
        I've saved it, dismiss
      </button>
    </div>
  );
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
