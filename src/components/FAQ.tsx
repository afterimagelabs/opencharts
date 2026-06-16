const qs = [
  {
    q: 'Is OpenCharts a law firm? Is this legal advice?',
    a: "No. OpenCharts is a public-interest project, not a law firm, and nothing here is legal advice. The HIPAA Privacy Rule is federal law that applies on its own — we just help you exercise the access right it already grants you. For your specific situation, talk to an attorney.",
  },
  {
    q: 'Does this work outside the United States?',
    a: "The 30-day deadline is a U.S. federal rule (45 CFR § 164.524). Most other countries have their own patient-access laws — Canada (PIPEDA), the UK and EU (GDPR Article 15), Australia (Privacy Act) — but the deadlines and complaint processes differ. We're collecting templates for other jurisdictions on GitHub; contributions welcome.",
  },
  {
    q: 'What if my provider says they need more than 30 days?',
    a: "They can extend once, by up to 30 days, but only if they tell you in writing within the first 30 days and explain the delay. A verbal \"we need more time\" doesn't qualify. If you got no written notice and Day 30 passed, the extension didn't happen.",
  },
  {
    q: 'Can my provider charge me for the records?',
    a: "They can charge a reasonable, cost-based fee — labor for copying, postage, the cost of the storage media — but not for searching or retrieving the records, and not a per-page fee that exceeds actual cost. HHS publishes the specific limits in its 2016 guidance.",
  },
  {
    q: 'What format am I entitled to receive my records in?',
    a: "If the records are kept electronically, you have the right to receive them in an electronic form and format of your choice, as long as that format is readily producible. The provider can't force you to take paper if a usable PDF or download is available.",
  },
  {
    q: 'Where does the OpenCharts project live, and who runs it?',
    a: "OpenCharts is a small group of patient advocates, lawyers, and engineers. The code, the documents, and every change are on GitHub at afterimagelabs/opencharts. We don't take donations, sell anything, or run ads. If you want to help, the easiest path is a pull request.",
  },
];

export default function FAQ() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 06</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              Common questions.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              If your question isn't here, the project's GitHub Discussions is the right place to
              ask. We answer there in public so the next person can find the answer too.
            </p>
          </div>
          <div className="lg:col-span-8">
            <dl className="divide-y hairline border-t border-b hairline">
              {qs.map((item) => (
                <details key={item.q} className="group py-7 px-1">
                  <summary className="flex items-start gap-6 cursor-pointer list-none">
                    <span className="font-serif text-xl lg:text-2xl font-semibold leading-snug flex-1">
                      {item.q}
                    </span>
                    <span
                      aria-hidden
                      className="font-mono text-2xl text-ink-muted group-open:rotate-45 transition-transform leading-none mt-1"
                    >
                      +
                    </span>
                  </summary>
                  <div className="mt-4 pl-0 lg:pr-12 text-ink-soft leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
