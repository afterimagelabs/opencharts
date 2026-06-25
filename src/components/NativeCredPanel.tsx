// Reusable per-service native-credential panel. Lives inside the
// service card on /dashboard/webhook-secrets for services that support
// native signature verification (Twilio + Mailgun).

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  clearNativeCred,
  getNativeCredStatus,
  setNativeCred,
  type NativeCredStatus,
  type NativeService,
} from '../lib/dashboardNativeCreds';

const SERVICE_FIELD_LABEL: Record<NativeService, string> = {
  twilio: 'Twilio Auth Token',
  mailgun: 'Mailgun signing key',
};

const SERVICE_TENANT_URL_TEMPLATE: Record<NativeService, string> = {
  twilio: '/api/webhooks/twilio/<your_tenant_id>',
  mailgun: '/api/webhooks/mailgun/<your_tenant_id>',
};

export default function NativeCredPanel({
  supabase,
  service,
  tenantId,
}: {
  supabase: SupabaseClient;
  service: NativeService;
  // Surfaced in the integration hint so the tenant can copy the URL
  // directly. Pulled from useMembership upstream.
  tenantId: string;
}) {
  const [status, setStatus] = useState<NativeCredStatus | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [valueInput, setValueInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await getNativeCredStatus(supabase, service);
      if (cancelled) return;
      if (!r.ok) setLoadingError(r.message);
      else {
        setStatus(r.status);
        setLoadingError(null);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, service, reloadKey]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    const r = await setNativeCred(supabase, service, valueInput);
    setSubmitting(false);
    if (!r.ok) {
      setSubmitError(r.message);
      return;
    }
    setValueInput('');
    setEditing(false);
    setReloadKey((n) => n + 1);
  }

  async function onClear() {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Clear the native credential? The native-sig webhook URL will return 401 until you set a new one.')) {
      return;
    }
    const r = await clearNativeCred(supabase, service);
    if (!r.ok) {
      // eslint-disable-next-line no-alert
      alert(`Could not clear: ${r.message}`);
      return;
    }
    setReloadKey((n) => n + 1);
  }

  const tenantUrl = SERVICE_TENANT_URL_TEMPLATE[service].replace('<your_tenant_id>', tenantId);

  return (
    <div className="mt-5 pt-5 border-t hairline">
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">
        Native signature verification
      </div>

      {loadingError && (
        <p className="text-sm text-seal mb-2" role="alert">
          Could not load status: {loadingError}
        </p>
      )}

      {status === null && !loadingError && (
        <p className="font-mono text-[12px] text-ink-muted">Loading…</p>
      )}

      {status && !status.configured && !editing && (
        <>
          <p className="text-ink-soft text-[13px] leading-relaxed">
            Not configured. The shared-secret URL above is the only auth path right now.
            Setting a {SERVICE_FIELD_LABEL[service]} below enables the native-sig URL.
          </p>
          <button
            type="button"
            className="mt-3 px-3 py-1.5 bg-ink text-paper text-[11px] uppercase tracking-[0.18em] hover:bg-ink/90"
            onClick={() => setEditing(true)}
          >
            Set {SERVICE_FIELD_LABEL[service]}
          </button>
        </>
      )}

      {status && status.configured && !editing && (
        <div>
          <p className="font-mono text-[13px] text-moss">
            ✓ Configured{status.updated_at && <span className="text-ink-muted"> · updated {fmtShortDate(status.updated_at)}</span>}
          </p>
          <p className="text-ink-soft text-[12px] mt-1">
            Point your {service} webhook at <code className="font-mono break-all">{tenantUrl}</code>.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 bg-paper-warm/60 border hairline text-[11px] uppercase tracking-[0.18em] hover:bg-paper-warm"
              onClick={() => setEditing(true)}
            >
              Replace
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-seal hover:underline"
              onClick={() => void onClear()}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={onSubmit} className="space-y-2">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            {SERVICE_FIELD_LABEL[service]}
          </label>
          <input
            type="password"
            required
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            placeholder={
              service === 'twilio' ? 'Your Twilio Auth Token' : 'Your Mailgun HTTP signing key'
            }
            className="w-full border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
          />
          {submitError && (
            <p className="text-sm text-seal" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || valueInput.trim().length === 0}
              className="px-3 py-1.5 bg-ink text-paper text-[11px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-ink-muted hover:text-ink"
              onClick={() => {
                setEditing(false);
                setValueInput('');
                setSubmitError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
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
