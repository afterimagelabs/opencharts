const steps = [
  {
    day: 'Day 0',
    title: 'Send the request',
    body:
      'Download the request letter PDF. Fill in your provider and date of birth, sign it, and mail it certified. Keep the green slip — that scan is your Day-0 timestamp.',
    action: 'Mail it certified',
  },
  {
    day: 'Days 1–29',
    title: 'Log every contact',
    body:
      'Phone, email, or hear back from the provider? Add a row to the audit log. One row per contact, in plain English. No legalese needed.',
    action: 'Open the audit log',
  },
  {
    day: 'Day 30',
    title: 'Check the mail',
    body:
      "If the records arrived, you're done. If a written extension arrived, log it. If neither arrived, you're in the OCR-complaint window.",
    action: 'Open your mail',
  },
  {
    day: 'Day 31+',
    title: 'File the complaint',
    body:
      "Paste the audit log into the pre-filled OCR complaint and submit. The full timeline goes in as your evidence attachment.",
    action: 'Submit the complaint',
  },
];

export default function GetStarted() {
  return (
    <section id="start" className="border-b hairline bg-paper-warm/30 relative">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 07</div>
          <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
            Start in under ten minutes.
          </h2>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            Four steps over four to five weeks. Most of it is waiting. The real work
            happens on two days: the day you mail the request, and the day you file the
            complaint if the records never came.
          </p>
        </div>

        <ol className="mt-14 grid md:grid-cols-2 gap-px bg-ink/15 border hairline">
          {steps.map((s, i) => (
            <li key={s.title} className="bg-paper p-7 lg:p-9 flex flex-col relative">
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-xs text-seal font-semibold">{s.day}</div>
                <div className="font-serif text-2xl text-ink/20 font-bold">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
              <h3 className="font-serif text-2xl mt-4 leading-tight font-semibold">{s.title}</h3>
              <p className="mt-3 text-ink-soft leading-relaxed flex-1">{s.body}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
                <span aria-hidden className="inline-block w-6 h-px bg-ink/30" />
                {s.action}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <a
            href="/toolkit/records-request.pdf"
            download
            className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-paper rounded-sm font-medium hover:bg-seal transition-colors"
          >
            Request letter (PDF) <span aria-hidden>↓</span>
          </a>
          <a
            href="/toolkit/audit-log.csv"
            download
            className="inline-flex items-center gap-2 px-5 py-3 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            Audit log (CSV) <span aria-hidden>↓</span>
          </a>
          <a
            href="/toolkit/ocr-complaint-guide.pdf"
            download
            className="inline-flex items-center gap-2 px-5 py-3 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            OCR complaint guide (PDF) <span aria-hidden>↓</span>
          </a>
        </div>

        <p className="mt-6 text-sm text-ink-muted max-w-2xl leading-relaxed">
          All three are MIT-licensed; adapt them, translate them, share them. Nothing in them is
          legal advice. For your specific situation, talk to an attorney.
        </p>
      </div>
    </section>
  );
}
