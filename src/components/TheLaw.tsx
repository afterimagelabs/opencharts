export default function TheLaw() {
  return (
    <section id="the-law" className="border-b hairline bg-paper-warm/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 01</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              What the law actually says.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              The HIPAA Privacy Rule is enforced by the U.S. Department of Health and Human Services'
              Office for Civil Rights. The 30-day deadline isn't a guideline. It's the rule. The full
              citation is below; the plain English version is to the right.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <figure className="bg-paper border hairline border-l-4 border-l-seal p-7 lg:p-9">
              <blockquote className="font-serif text-xl lg:text-2xl leading-snug text-ink">
                "A covered entity must act on the individual's request for access no later than
                <span className="bg-seal/10 text-seal px-1.5 mx-0.5 rounded-sm font-semibold">
                  {' '}30 days{' '}
                </span>
                after receipt of the request..."
              </blockquote>
              <figcaption className="mt-5 pt-5 border-t hairline flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-mono text-ink-soft">
                  45 C.F.R. § 164.524(b)(2)(i)
                </span>
                <a
                  href="https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.524"
                  target="_blank"
                  rel="noreferrer"
                  className="text-seal hover:underline underline-offset-4"
                >
                  View on eCFR ↗
                </a>
              </figcaption>
            </figure>

            <div className="grid sm:grid-cols-3 gap-px bg-ink/15">
              <PlainFact
                label="The deadline"
                value="30 days"
                detail="From the day the provider receives your written request."
              />
              <PlainFact
                label="One extension allowed"
                value="+30 days"
                detail="They must notify you in writing within the first 30 days. The extension is one-time only."
              />
              <PlainFact
                label="If they miss it"
                value="Violation"
                detail="You can file a complaint with HHS OCR. Penalties run up to $50,000 per incident."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlainFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="bg-paper p-6 lg:p-7">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-muted">{label}</div>
      <div className="font-serif text-3xl lg:text-4xl mt-2 font-semibold text-ink">{value}</div>
      <div className="mt-3 text-sm text-ink-soft leading-relaxed">{detail}</div>
    </div>
  );
}
