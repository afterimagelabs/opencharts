export default function ProviderAlert() {
  return (
    <a
      href="#penalties"
      className="block bg-ink text-paper border-b border-seal/30 hover:bg-seal-deep transition-colors group"
    >
      <div className="mx-auto max-w-6xl px-6 py-2.5 flex items-center gap-4 text-sm">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-seal shrink-0" aria-hidden />
        <span className="flex-1 leading-snug text-paper/90">
          HIPAA penalties for delayed records access reach{' '}
          <span className="font-semibold text-paper">$2.1M per category per year</span>.
        </span>
        <span className="font-medium whitespace-nowrap text-paper group-hover:underline underline-offset-4">
          See the list →
        </span>
      </div>
    </a>
  );
}
