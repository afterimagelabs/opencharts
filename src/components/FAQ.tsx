const qs = [
  {
    q: 'Is OpenCharts a law firm? Is this legal advice?',
    a: "No. OpenCharts is a public-interest project, not a law firm, and nothing on this site is legal advice. The HIPAA Privacy Rule is federal law that applies on its own. We just help you exercise the access right it already grants you. For your specific situation, talk to an attorney.",
  },
  {
    q: 'Does this work outside the United States?',
    a: "The 30-day deadline is a U.S. federal rule (45 CFR § 164.524). Most other countries have their own access laws: Canada (PIPEDA), the UK and EU (GDPR Article 15), Australia (Privacy Act). The deadlines and the complaint processes are different. We're collecting templates for other jurisdictions on GitHub; contributions welcome.",
  },
  {
    q: 'What if my provider says they need more than 30 days?',
    a: "They can extend once, by up to 30 days, but only if they tell you in writing within the first 30 days and explain the delay. A verbal \"we need more time\" doesn't qualify. If you got no written notice and Day 30 passed, the extension didn't happen.",
  },
  {
    q: 'Can my provider charge me for the records?',
    a: "They can charge a reasonable, cost-based fee. That covers labor for copying, postage, and the cost of the storage media. It does not cover searching or retrieving the records, and a per-page fee can't exceed actual cost. HHS published the specific limits in its 2016 guidance.",
  },
  {
    q: 'What format am I entitled to receive my records in?',
    a: "If the records are kept electronically, you have the right to receive them in an electronic form and format of your choice, as long as that format is readily producible. The provider can't force you to take paper if a usable PDF or download is available.",
  },
  {
    q: 'How fast does OCR actually act on a complaint?',
    a: "Slowly, usually. OCR's published complaint process can take many months to resolve, and most complaints are closed without a formal enforcement action. That does not mean filing is pointless. A filed complaint creates a record, signals a pattern when paired with others, and is sometimes enough on its own to make a provider move. But if you need the records this week, the OCR complaint is the long-game lever. The first-shift levers are the certified-mail follow-up and a call to the practice administrator or the provider's compliance officer.",
  },
  {
    q: "Could my provider drop me as a patient for sending this letter?",
    a: "Some patients worry about this and it is a fair worry. Providers can generally end the patient relationship, but they have to do it cleanly: with notice, with referrals, and without abandoning you mid-treatment. Filing a HIPAA records request is exercising a federal right, and retaliation specifically for exercising that right is itself a HIPAA violation under 45 CFR § 164.530(g). If you are concerned, send the request through the patient portal or by certified mail (less personal than a confrontation), keep your audit log clean, and consider talking to an attorney before escalating to an OCR complaint.",
  },
  {
    q: 'Where does the OpenCharts project live, and who runs it?',
    a: "OpenCharts is a small, volunteer project. The code, the documents, and every change are on GitHub at afterimagelabs/opencharts. We don't take donations, sell anything, or run ads. The easiest way to help is a pull request.",
  },
];

export default function FAQ() {
  return (
    <section className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 08</div>
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
