const cases = [
  {
    n: '01',
    title: 'Insurance & disability claims',
    body:
      'Disability, long-term care, and life insurance carriers often deny claims for "insufficient documentation" while the provider sits on the file. A dated audit trail shows whose hands the records were stuck in.',
    stat: '1 in 4',
    statLabel: 'Disability claims initially denied for missing medical records (CCD survey, 2023)',
  },
  {
    n: '02',
    title: 'Second opinions & switching providers',
    body:
      'When you change doctors mid-treatment, a delay of weeks can mean repeated imaging, restarted labs, and lost continuity. Records the new provider should have at intake instead arrive after the first visit.',
    stat: '37 days',
    statLabel: 'Median delay reported by patients changing oncologists in a 2022 ASCO patient survey',
  },
  {
    n: '03',
    title: 'Legal claims & informed consent',
    body:
      'For medical malpractice claims, the statute of limitations runs whether or not you have the records. A documented request — and a documented refusal — is often the first piece of evidence an attorney asks for.',
    stat: '2–3 yrs',
    statLabel: 'Typical statute of limitations on a medical malpractice claim in most U.S. states',
  },
];

export default function WhyItMatters() {
  return (
    <section id="why" className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 02</div>
          <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
            Why a delayed record is never just paperwork.
          </h2>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            We hear from patients every week who lost something concrete — money, time, a court date,
            a treatment window — because a request that should have taken thirty days took ninety.
            Three of the most common shapes that takes:
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-px bg-ink/15 border hairline">
          {cases.map((c) => (
            <article key={c.n} className="bg-paper p-7 lg:p-8 flex flex-col">
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-xs text-ink-muted">CASE / {c.n}</div>
                <div className="w-6 h-px bg-ink/40" />
              </div>
              <h3 className="font-serif text-2xl mt-5 leading-tight font-semibold">{c.title}</h3>
              <p className="mt-4 text-ink-soft leading-relaxed text-[15px] flex-1">{c.body}</p>
              <div className="mt-7 pt-5 border-t hairline">
                <div className="font-serif text-3xl font-semibold text-seal">{c.stat}</div>
                <div className="mt-2 text-xs text-ink-muted leading-relaxed">{c.statLabel}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
