const cases = [
  {
    provider: 'Bayfront Health St. Petersburg',
    where: 'Florida',
    year: '2019',
    amount: '$85,000',
    summary:
      "The first settlement under the HHS Right of Access Initiative. A mother asked for her unborn child's fetal heart monitor records. The hospital took more than nine months to hand them over.",
    href: 'https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html',
    source: 'HHS · Sept 2019 · Listed on the OCR Resolution Agreements page',
  },
];

const pattern = {
  title: 'And another 40+ since.',
  body:
    'Every published settlement under the Right of Access Initiative names the provider, the amount paid, and the corrective action plan they agreed to. Amounts have ranged from a few thousand dollars to well into six figures. The full list is on the HHS Resolution Agreements page.',
  href: 'https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html',
};

export default function Penalties() {
  return (
    <section id="penalties" className="border-b hairline bg-paper">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 01</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              Yes, the rule has teeth.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              Since September 2019, the U.S. Department of Health and Human Services Office for
              Civil Rights has run a sustained federal enforcement campaign called the
              <em> HIPAA Right of Access Initiative</em>. It targets exactly one thing: patients
              not getting their records on time.
            </p>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Every settlement is public. Each one names the provider, the amount paid, and the
              years-long corrective action plan that follows. A small sample is on the right.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-px bg-ink/15 border hairline">
              <Stat n="50+" label="Right of Access settlements published as of 2024" />
              <Stat n="$3.5K +" label="Smallest published penalty under the initiative" />
              <Stat n="Public" label="Every case names a real provider on the OCR site" />
            </div>
            <p className="mt-3 text-xs text-ink-muted leading-relaxed">
              Counts and dollar ranges reflect the HHS Resolution Agreements page at the time this
              site was last updated. The current running total is on the HHS site, linked below.
            </p>

            <div className="mt-8 text-sm">
              <p className="text-ink-muted leading-relaxed">
                If you are a provider and a patient sent you a link to this page, here is what
                they want you to read first:
              </p>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <a
                    href="https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    HHS OCR — Resolution Agreements and Civil Monetary Penalties ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.hipaajournal.com/category/right-of-access/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    HIPAA Journal — Right of Access coverage ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.hhs.gov/hipaa/for-individuals/right-to-access/index.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    HHS — Individuals' Right under HIPAA to Access their Health Information ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            {cases.map((c) => (
              <a
                key={c.provider}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                className="block group bg-paper-warm/40 border hairline p-7 hover:border-ink transition-colors"
              >
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div className="font-serif text-2xl font-semibold leading-tight">
                    {c.provider}
                    <span className="text-ink-muted font-sans font-normal text-sm ml-2">
                      ({c.where})
                    </span>
                  </div>
                  <div className="font-mono text-xs text-ink-muted">{c.year}</div>
                </div>
                <div className="mt-4 flex items-baseline gap-4">
                  <div className="font-serif text-3xl font-bold text-seal">{c.amount}</div>
                  <div className="text-xs text-ink-muted uppercase tracking-[0.2em]">
                    Settlement + corrective action plan
                  </div>
                </div>
                <p className="mt-4 text-ink-soft leading-relaxed text-[15px]">{c.summary}</p>
                <div className="mt-5 pt-4 border-t hairline flex items-center justify-between text-xs">
                  <span className="text-ink-muted uppercase tracking-[0.18em]">{c.source}</span>
                  <span className="text-seal group-hover:underline underline-offset-4">
                    Open the HHS list ↗
                  </span>
                </div>
              </a>
            ))}

            <a
              href={pattern.href}
              target="_blank"
              rel="noreferrer"
              className="block group bg-paper-warm/40 border hairline p-7 hover:border-ink transition-colors"
            >
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div className="font-serif text-2xl font-semibold leading-tight text-ink">
                  {pattern.title}
                </div>
                <div className="font-mono text-xs text-ink-muted">2019 — present</div>
              </div>
              <p className="mt-4 text-ink-soft leading-relaxed text-[15px]">{pattern.body}</p>
              <div className="mt-5 pt-4 border-t hairline flex items-center justify-between text-xs">
                <span className="text-ink-muted uppercase tracking-[0.18em]">
                  HHS · OCR Resolution Agreements
                </span>
                <span className="text-seal group-hover:underline underline-offset-4">
                  Open the HHS list ↗
                </span>
              </div>
            </a>

            <a
              href="https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html"
              target="_blank"
              rel="noreferrer"
              className="block group bg-ink text-paper p-7 hover:bg-seal transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-paper/60">
                    The full list
                  </div>
                  <div className="font-serif text-2xl mt-2 font-semibold">
                    Every other published settlement is here.
                  </div>
                  <p className="mt-3 text-sm text-paper/80 leading-relaxed">
                    The HHS Office for Civil Rights maintains the running list of resolution
                    agreements and civil monetary penalties. Every one of these names a real
                    provider.
                  </p>
                </div>
                <span className="font-mono text-3xl text-paper">↗</span>
              </div>
            </a>

            <p className="text-xs text-ink-muted px-1 leading-relaxed">
              Settlement details come from the HHS Office for Civil Rights press releases linked
              above. The HHS pages are the primary source; the dollar amounts, dates, and
              corrective action plans reflect what HHS published at the time of each settlement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-paper p-4">
      <div className="font-serif text-2xl text-seal font-semibold leading-none">{n}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-ink-muted leading-snug">
        {label}
      </div>
    </div>
  );
}
