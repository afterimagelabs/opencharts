export default function ProviderAlert() {
  return (
    <a
      href="#penalties"
      className="block bg-ink text-paper border-b border-seal/30 hover:bg-seal-deep transition-colors group"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-2.5 flex items-center gap-3 sm:gap-4 text-[13px] sm:text-sm">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-seal shrink-0" aria-hidden />
        <span className="flex-1 leading-snug text-paper/90 min-w-0">
          HHS OCR has collected{' '}
          <span className="font-semibold text-paper">$140M+ in HIPAA penalties</span> to date.
        </span>
        <span className="font-medium whitespace-nowrap text-paper group-hover:underline underline-offset-4 shrink-0">
          See the list →
        </span>
      </div>
    </a>
  );
}
