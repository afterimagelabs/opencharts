const tools = [
  {
    n: '01',
    title: 'The Request',
    sub: 'A letter the law recognizes',
    body:
      'A plain-language records request that cites 45 CFR § 164.524 directly, names the format you want delivery in, and starts the 30-day clock. Fill in the blanks, sign, mail certified.',
    artifact: 'records-request.pdf',
    href: '/toolkit/records-request.pdf',
  },
  {
    n: '02',
    title: 'The Log',
    sub: 'Where every contact lives',
    body:
      'A simple CSV with one row per contact: day, date, time, type, who you spoke with, what they said, what they promised, the next follow-up. Open it in Google Sheets, Excel, or Numbers.',
    artifact: 'audit-log.csv',
    href: '/toolkit/audit-log.csv',
  },
  {
    n: '03',
    title: 'The Complaint',
    sub: 'A guide to the HHS OCR form',
    body:
      'A short guide that tells you exactly what to have ready before you open the HHS OCR online complaint form, including a paste-ready summary template. Most patients finish the form in under ten minutes.',
    artifact: 'ocr-complaint-guide.pdf',
    href: '/toolkit/ocr-complaint-guide.pdf',
  },
];

export default function Toolkit() {
  return (
    <section id="toolkit" className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 06</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              Three small artifacts. One enforceable timeline.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              OpenCharts isn't software you sign up for. It's a small set of documents (a request,
              a log, a complaint) designed so each feeds the next. Free, MIT-licensed, no account.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Everything is in the public repository. Translations, corrections, and additions are
              welcome via pull request.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="bg-paper-warm/40 border hairline px-5 py-4 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
              <span>Did one of these help you, or could it be better?</span>
              <a
                href="https://github.com/afterimagelabs/opencharts/discussions/new?category=feedback"
                target="_blank"
                rel="noreferrer"
                className="text-seal hover:underline underline-offset-4 font-medium whitespace-nowrap"
              >
                Tell us on GitHub Discussions ↗
              </a>
            </div>

            {tools.map((t) => (
              <a
                key={t.n}
                href={t.href}
                download
                className="group block bg-paper border hairline p-7 hover:border-ink transition-colors"
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
                    <div className="mt-5 pt-4 border-t hairline flex items-center justify-between text-xs">
                      <span className="text-ink-muted uppercase tracking-[0.18em]">
                        Free · MIT licensed
                      </span>
                      <span className="text-seal group-hover:underline underline-offset-4 font-medium">
                        Download ↓
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
