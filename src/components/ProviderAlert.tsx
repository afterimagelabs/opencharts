export default function ProviderAlert() {
  return (
    <a
      href="#penalties"
      className="block bg-ink text-paper border-b border-seal/40 hover:bg-seal-deep transition-colors group"
    >
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-4 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] bg-seal text-paper px-2 py-1 rounded-sm whitespace-nowrap font-semibold">
          Provider Notice
        </span>
        <span className="flex-1 leading-snug">
          If a patient sent you this link, they are time-stamping every step of their records
          request.{' '}
          <span className="font-semibold">
            HHS has published 50+ Right of Access fines since 2019.
          </span>
        </span>
        <span className="font-medium whitespace-nowrap text-paper group-hover:underline underline-offset-4">
          See the list →
        </span>
      </div>
    </a>
  );
}
