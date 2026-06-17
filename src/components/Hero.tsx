export default function Hero() {
  return (
    <section id="top" className="relative border-b hairline overflow-hidden">
      <div className="absolute inset-0 paper-grain opacity-60 pointer-events-none" />
      <div className="mx-auto max-w-6xl px-5 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-24 lg:pb-28 relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-ink-muted mb-8">
              <span className="inline-block w-8 h-px bg-ink" />
              <span>A free, open-source records-request service</span>
            </div>

            <h1 className="font-serif text-[36px] sm:text-5xl lg:text-7xl leading-[1.05] sm:leading-[1.02] tracking-tight font-semibold">
              Hold your providers to{' '}
              <span className="relative whitespace-nowrap">
                the 30-day rule
                <svg
                  aria-hidden
                  viewBox="0 0 320 18"
                  className="absolute -bottom-2 left-0 w-full text-seal"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M2 12 Q 80 2, 160 9 T 318 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>

            <p className="mt-6 sm:mt-10 text-base sm:text-lg lg:text-xl text-ink-soft max-w-prose leading-relaxed">
              Under the HIPAA Privacy Rule, every patient in the United States has the right to
              a copy of their own medical records within 30 days of asking. Providers stall
              anyway. What holds them accountable, when they do, is a clean dated record of every
              step. OpenCharts helps you build one.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-wrap items-center gap-3 sm:gap-4">
              <a
                href="#toolkit"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-ink text-paper rounded-sm font-medium hover:bg-seal transition-colors"
              >
                Get the toolkit
                <span aria-hidden>→</span>
              </a>
              <a
                href="#the-law"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                Read the law
              </a>
              <span className="text-xs sm:text-sm text-ink-muted sm:ml-2 w-full sm:w-auto">
                Free · MIT licensed · No account
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Seal />
          </div>
        </div>
      </div>
    </section>
  );
}

function Seal() {
  return (
    <div className="relative aspect-square w-full max-w-[320px] sm:max-w-sm lg:max-w-md mx-auto">
      <div className="absolute inset-0 rounded-full bg-paper-warm border-2 border-seal" />
      <div className="absolute inset-3 rounded-full border border-seal/70" />
      <div className="absolute inset-0 flex items-center justify-center text-center px-8 sm:px-10 lg:px-12">
        <div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] text-seal font-medium mb-2 sm:mb-3">
            45 CFR § 164.524
          </div>
          <div className="font-serif text-[48px] sm:text-[60px] lg:text-[68px] leading-none font-bold text-seal">
            30
          </div>
          <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.28em] sm:tracking-[0.32em] text-seal font-medium mt-2 sm:mt-3">
            Days · Maximum
          </div>
          <div className="mt-4 sm:mt-6 mx-auto w-10 sm:w-12 h-px bg-seal/60" />
          <div className="mt-3 sm:mt-4 font-serif italic text-[10px] sm:text-[11px] lg:text-xs text-ink-soft leading-snug">
            "...not later than 30 days after receipt of the request..."
          </div>
          <div className="mt-2 sm:mt-3 text-[8px] sm:text-[9px] uppercase tracking-[0.22em] sm:tracking-[0.25em] text-ink-muted">
            HHS · Office for Civil Rights
          </div>
        </div>
      </div>
      <CurvedText />
    </div>
  );
}

function CurvedText() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 400"
      aria-hidden
    >
      <defs>
        <path id="curve-top" d="M 50 200 A 150 150 0 0 1 350 200" />
        <path id="curve-bot" d="M 20 200 A 180 180 0 0 0 380 200" />
      </defs>
      <text className="fill-seal" style={{ fontSize: 12, letterSpacing: '0.35em', fontWeight: 600 }}>
        <textPath href="#curve-top" startOffset="50%" textAnchor="middle">
          THE OPENCHARTS PROJECT
        </textPath>
      </text>
      <text className="fill-seal" style={{ fontSize: 11, letterSpacing: '0.4em', fontWeight: 500 }}>
        <textPath href="#curve-bot" startOffset="50%" textAnchor="middle">
          ★  PATIENT  ACCESS  ★
        </textPath>
      </text>
    </svg>
  );
}
