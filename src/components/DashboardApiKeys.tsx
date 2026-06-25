// /dashboard/api-keys — list, mint, revoke API keys.

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listApiKeys,
  mintApiKey,
  revokeApiKey,
  type ApiKeyRow,
  type MintedApiKey,
} from '../lib/dashboardApiKeys';

export default function DashboardApiKeys({ supabase }: { supabase: SupabaseClient }) {
  type State =
    | { kind: 'loading' }
    | { kind: 'ok'; rows: ApiKeyRow[] }
    | { kind: 'error'; message: string };
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [mintName, setMintName] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<MintedApiKey | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await listApiKeys(supabase);
      if (cancelled) return;
      if (!r.ok) setState({ kind: 'error', message: r.message });
      else setState({ kind: 'ok', rows: r.api_keys });
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, reloadKey]);

  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold mb-1">API keys</h2>
      <p className="text-ink-soft text-sm leading-relaxed mb-6">
        Used to authenticate calls to <code className="font-mono">POST /api/v1/requests</code>
        {' '}and the rest of the tenant API. The plaintext secret is shown exactly once at
        creation — store it in your own server-side secrets manager.
      </p>

      {revealed && <RevealedSecret api_key={revealed} onDismiss={() => setRevealed(null)} />}

      <div className="border hairline bg-paper/50 p-6 mb-6">
        <h3 className="font-serif text-lg font-semibold mb-3">Mint a new key</h3>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setMinting(true);
            setMintError(null);
            const r = await mintApiKey(supabase, mintName);
            setMinting(false);
            if (!r.ok) {
              setMintError(r.message);
              return;
            }
            setMintName('');
            setRevealed(r.api_key);
            setReloadKey((n) => n + 1);
          }}
        >
          <input
            type="text"
            required
            value={mintName}
            onChange={(e) => setMintName(e.target.value)}
            placeholder="CMS integration"
            className="flex-1 border hairline px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
          />
          <button
            type="submit"
            disabled={minting || mintName.trim().length === 0}
            className="px-4 py-2 bg-ink text-paper text-[12px] uppercase tracking-[0.18em] hover:bg-ink/90 disabled:opacity-50"
          >
            {minting ? 'Minting…' : 'Mint key'}
          </button>
        </form>
        {mintError && (
          <p className="mt-2 text-sm text-seal" role="alert">
            {mintError}
          </p>
        )}
      </div>

      {state.kind === 'loading' && (
        <p className="font-mono text-sm text-ink-muted">Loading keys…</p>
      )}
      {state.kind === 'error' && (
        <p className="text-sm text-seal" role="alert">
          Could not load API keys: {state.message}
        </p>
      )}
      {state.kind === 'ok' && state.rows.length === 0 && (
        <p className="text-ink-soft text-sm">No API keys yet. Mint one above.</p>
      )}
      {state.kind === 'ok' && state.rows.length > 0 && (
        <KeysTable
          rows={state.rows}
          onRevoke={async (id) => {
            const r = await revokeApiKey(supabase, id);
            if (!r.ok) {
              // eslint-disable-next-line no-alert
              alert(`Could not revoke: ${r.message}`);
              return;
            }
            setReloadKey((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function RevealedSecret({
  api_key,
  onDismiss,
}: {
  api_key: MintedApiKey;
  onDismiss: () => void;
}) {
  return (
    <div className="border-2 border-seal bg-paper-warm/30 p-6 mb-6">
      <h3 className="font-serif text-lg font-semibold text-seal mb-1">
        Copy this secret now — it won't be shown again
      </h3>
      <p className="text-ink-soft text-sm leading-relaxed mb-3">
        <span className="font-mono">{api_key.name}</span> ·{' '}
        <span className="text-ink-muted">prefix {api_key.prefix}</span>
      </p>
      <code className="block break-all bg-ink/5 border hairline px-3 py-2 font-mono text-[13px] mb-3">
        {api_key.secret}
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

function KeysTable({
  rows,
  onRevoke,
}: {
  rows: ApiKeyRow[];
  onRevoke: (id: string) => Promise<void>;
}) {
  return (
    <div className="border hairline overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_120px_120px_80px] gap-4 px-5 py-3 bg-paper-warm/60 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        <div>Name</div>
        <div>Prefix</div>
        <div>Created</div>
        <div>Last used</div>
        <div className="text-right">Status</div>
      </div>
      <div className="divide-y hairline">
        {rows.map((r) => {
          const revoked = !!r.revoked_at;
          return (
            <div
              key={r.id}
              className="grid grid-cols-[1fr_120px_120px_120px_80px] gap-4 px-5 py-3 font-mono text-[13px]"
            >
              <div className="text-ink truncate">{r.name}</div>
              <div className="text-ink-muted">{r.prefix}…</div>
              <div className="text-ink-muted">{fmtShortDate(r.created_at)}</div>
              <div className="text-ink-muted">
                {r.last_used_at ? fmtShortDate(r.last_used_at) : '—'}
              </div>
              <div className="text-right">
                {revoked ? (
                  <span className="text-ink-muted text-[11px] uppercase tracking-[0.18em]">
                    Revoked
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-[11px] uppercase tracking-[0.18em] text-seal hover:underline"
                    onClick={() => void onRevoke(r.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
