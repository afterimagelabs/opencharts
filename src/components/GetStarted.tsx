const steps = [
  {
    day: 'Day 0',
    title: 'Send the request',
    body:
      'Download the OpenCharts request letter, fill in your provider and date of birth, and mail it certified. Keep the green slip. That scan is your Day-0 timestamp.',
    cmd: '$ download records-request.pdf',
  },
  {
    day: 'Days 1–29',
    title: 'Log every contact',
    body:
      'Each time you phone, email, or hear from the provider, add a row to the audit log. One row per contact, in plain English. No legalese needed.',
    cmd: '$ open audit-log.xlsx',
  },
  {
    day: 'Day 30',
    title: 'Check for the records, or the extension',
    body:
      'If the records arrived, you\'re done. If a written extension arrived, log it. If neither arrived, you\'re in the OCR-complaint window.',
    cmd: '$ status --check',
  },
  {
    day: 'Day 31+',
    title: 'File the complaint',
    body:
      'Export the audit log, paste the summary into the pre-filled OCR complaint, and submit. The full timeline goes in as your evidence attachment.',
    cmd: '$ submit ocr-complaint.pdf',
  },
];

export default function GetStarted() {
  return (
    <section id="start" className="border-b hairline bg-paper-warm/30 relative">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 06</div>
          <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
            Start in under ten minutes.
          </h2>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            The whole process is four steps over four to five weeks. Most of it is waiting. The
            mechanical work happens on two days.
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
              <div className="mt-5 font-mono text-xs text-ink-soft bg-ink/5 border hairline px-3 py-2 rounded-sm">
                {s.cmd}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 px-6 py-3.5 bg-paper-edge text-ink-muted rounded-sm font-medium cursor-not-allowed">
            Toolkit coming soon
            <span aria-hidden>·</span>
            <span className="text-xs font-mono uppercase tracking-wider">in progress</span>
          </span>
          <a
            href="https://github.com/afterimagelabs/opencharts"
            className="inline-flex items-center gap-2 px-6 py-3.5 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            Track progress on GitHub
          </a>
        </div>

        <p className="mt-6 text-sm text-ink-muted max-w-2xl leading-relaxed">
          The artifacts above (the request letter, the audit log template, and the pre-filled OCR
          complaint) are being drafted and reviewed. When they ship, they will be MIT-licensed and
          downloadable from this page. Nothing on this site is legal advice; for your specific
          situation, talk to an attorney.
        </p>
      </div>
    </section>
  );
}
