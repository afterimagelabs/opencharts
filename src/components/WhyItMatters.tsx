const cases = [
  {
    n: '01',
    title: 'Insurance and disability claims',
    body:
      'Disability and life insurance carriers regularly deny claims citing "insufficient documentation" while the provider is the one sitting on the file. A dated log of every contact shows whose hands the records were actually stuck in.',
    stat: 'Common',
    statLabel:
      'Initial denials based on missing or late records are a known pattern in disability and long-term care claims.',
  },
  {
    n: '02',
    title: 'Second opinions and switching providers',
    body:
      'When you change doctors mid-treatment, a delay of weeks usually means repeat imaging, re-drawn labs, and a first visit with the new provider that should have started with the chart in hand.',
    stat: 'Weeks',
    statLabel:
      'The records that should arrive at intake often arrive after the first appointment.',
  },
  {
    n: '03',
    title: 'Legal claims and informed consent',
    body:
      'For medical malpractice claims, the statute of limitations runs whether or not you have the records. A documented request, and a documented refusal, is often the first piece of evidence an attorney asks for.',
    stat: '2–3 yrs',
    statLabel:
      'Typical statute of limitations on a medical malpractice claim in most U.S. states.',
  },
];

export default function WhyItMatters() {
  return (
    <section id="why" className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 03</div>
          <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
            Why a delayed record is never just paperwork.
          </h2>
          <p className="mt-6 text-lg text-ink-soft leading-relaxed">
            A request that should have taken thirty days routinely takes ninety. The patient ends
            up paying for the gap: money, a court date, a treatment window. The losses cluster
            into a few familiar shapes.
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
