const tools = [
  {
    n: '01',
    title: 'The Request',
    sub: 'A letter the law recognizes',
    body:
      'A plain-language records request that cites 45 CFR § 164.524 directly, asks for delivery in your preferred format, and sets the 30-day clock. Printable, mailable, and tested against real provider responses.',
    artifact: 'records-request.pdf',
  },
  {
    n: '02',
    title: 'The Log',
    sub: 'Where every contact lives',
    body:
      'A simple spreadsheet (Google Sheets, Excel, or CSV) with one row per contact: date, who, what was said, what was promised, what to follow up on. Pre-formatted for the OCR complaint exporter.',
    artifact: 'audit-log.xlsx',
  },
  {
    n: '03',
    title: 'The Complaint',
    sub: 'Ready to file with HHS',
    body:
      'A pre-filled OCR Health Information Privacy Complaint form. If you reach Day 31 with no records and no written extension, you take the log, fill in three fields, and submit. The complaint is filed in under five minutes.',
    artifact: 'ocr-complaint.pdf',
  },
];

export default function Toolkit() {
  return (
    <section id="toolkit" className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 04</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              Three small artifacts. One enforceable timeline.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              OpenCharts isn't software you sign up for. It's a small set of documents — a request, a
              log, a complaint — designed so each one feeds the next. Free, MIT-licensed, no account.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Everything is in the public repository. Translations, corrections, and additions are
              welcome via pull request.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-5">
            {tools.map((t) => (
              <article
                key={t.n}
                className="group bg-paper border hairline p-7 hover:border-ink transition-colors"
              >
                <div className="flex items-start gap-6">
                  <div className="font-serif text-4xl text-seal/80 leading-none pt-1">{t.n}</div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-serif text-2xl font-semibold leading-tight">{t.title}</h3>
                      <span className="font-mono text-xs text-ink-muted bg-paper-warm px-2 py-1 rounded-sm border hairline">
                        {t.artifact}
                      </span>
                    </div>
                    <div className="text-sm text-ink-muted mt-1 italic font-serif">{t.sub}</div>
                    <p className="mt-4 text-ink-soft leading-relaxed">{t.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
