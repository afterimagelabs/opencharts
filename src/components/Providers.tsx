const path = [
  {
    day: 'Day 0',
    title: 'Log the request, time-stamped',
    body:
      'Note the date of receipt on the request itself. That date starts the 30-day clock and is the first thing OCR asks about if a complaint is filed.',
  },
  {
    day: 'Day 1–7',
    title: 'Triage and decide whether you need the extension',
    body:
      'If the request is unusual (archived records, multiple departments, external imaging vendor) and you will not make 30 days, send the written extension notice now, while you are still inside the first 30 days. After Day 30, the extension is no longer available.',
  },
  {
    day: 'Day 8–25',
    title: 'Process, prepare, format-check',
    body:
      'Pull the records, redact what the request does not cover, and confirm the format. If the patient asked for an electronic format you can readily produce, prefer that over paper.',
  },
  {
    day: 'Day 26–30',
    title: 'Deliver and confirm',
    body:
      'Send the records. Confirm receipt in writing where you can. Note the delivery date in your tracking; if a complaint is later filed in error, this is what OCR will look at first.',
  },
];

export default function Providers() {
  return (
    <section id="for-providers" className="border-b hairline">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 02</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              For records departments.
            </h2>
            <p className="mt-6 text-ink-soft leading-relaxed">
              Most delays do not come from anyone deciding to stall. They come from understaffed
              records desks, EHR exports that take hours to run, and queues with no priority
              signal. OpenCharts is not trying to shame your team. It is trying to make the
              patient and your records desk work from the same calendar.
            </p>
            <p className="mt-4 text-ink-soft leading-relaxed">
              When a patient sends you a link to this page, here is what the well-run version of
              the next four weeks looks like. None of it is novel; it is the federal floor.
            </p>
            <div className="mt-8 text-sm text-ink-muted leading-relaxed">
              <p>Helpful starting points:</p>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <a
                    href="https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/access/index.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    HHS — Right of Access guidance for covered entities ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/index.html"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    HHS — Compliance and enforcement (provider-facing) ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.ahima.org/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-seal hover:underline underline-offset-4"
                  >
                    AHIMA — Practice briefs for HIM departments ↗
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-7">
            <ol className="grid sm:grid-cols-2 gap-px bg-ink/15 border hairline">
              {path.map((s, i) => (
                <li key={s.day} className="bg-paper p-6 lg:p-7 flex flex-col">
                  <div className="flex items-baseline justify-between">
                    <div className="font-mono text-xs text-seal font-semibold">{s.day}</div>
                    <div className="font-serif text-2xl text-ink/20 font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                  </div>
                  <h3 className="font-serif text-xl mt-3 leading-tight font-semibold">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-ink-soft leading-relaxed text-[15px]">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-xs text-ink-muted leading-relaxed px-1">
              If you got sent this link by mistake (your team did meet the deadline), the patient's
              OpenCharts audit log will reflect that. The log exists to be honest about the
              timeline, not only to capture failures.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
