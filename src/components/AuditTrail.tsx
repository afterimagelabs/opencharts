const log = [
  {
    day: 'DAY 00',
    date: '2026-04-03',
    time: '09:14',
    event: 'REQUEST SENT',
    detail: 'Records request mailed to Memorial Health · USPS certified · #7019 1640 0000 4523 8814',
    state: 'normal' as const,
  },
  {
    day: 'DAY 02',
    date: '2026-04-05',
    time: '13:02',
    event: 'DELIVERY CONFIRMED',
    detail: 'USPS scan: delivered, signed for at front desk by J. RAMIREZ',
    state: 'normal' as const,
  },
  {
    day: 'DAY 14',
    date: '2026-04-17',
    time: '10:30',
    event: 'FIRST FOLLOW-UP',
    detail: 'Phoned records dept. (513-555-0144). Spoke with K. Patel. Told: "still processing."',
    state: 'normal' as const,
  },
  {
    day: 'DAY 23',
    date: '2026-04-26',
    time: '16:48',
    event: 'SECOND FOLLOW-UP',
    detail: 'Email to records@memorialhealth.org. No response received within 72h.',
    state: 'normal' as const,
  },
  {
    day: 'DAY 30',
    date: '2026-05-03',
    time: '23:59',
    event: 'DEADLINE — 45 CFR § 164.524(b)(2)(i)',
    detail: 'No records received. No written extension notice received.',
    state: 'deadline' as const,
  },
  {
    day: 'DAY 31',
    date: '2026-05-04',
    time: '00:00',
    event: 'PROVIDER IN VIOLATION',
    detail: 'HHS OCR complaint generated from audit log → ready to file.',
    state: 'violation' as const,
  },
];

export default function AuditTrail() {
  return (
    <section className="border-b hairline bg-ink text-paper relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
           style={{
             backgroundImage:
               'repeating-linear-gradient(0deg, #fbfaf6 0 1px, transparent 1px 28px)',
           }}
      />
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28 relative">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-paper/50">§ 03</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              The audit trail does the arguing for you.
            </h2>
            <p className="mt-6 text-paper/80 leading-relaxed">
              On its own, "they're taking forever" doesn't go anywhere. A timestamped, sourced record
              of every contact does. This is what a complete OpenCharts log looks like at the moment
              the deadline expires.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-paper/60">
              <span className="inline-block w-8 h-px bg-paper/30" />
              <span>Sample audit log</span>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="bg-paper text-ink font-mono text-[13px] leading-relaxed border border-paper/20 shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b hairline bg-paper-warm/60">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                  <span className="inline-block w-2 h-2 rounded-full bg-seal" />
                  <span>opencharts-audit.log</span>
                </div>
                <div className="text-[11px] text-ink-muted">PATIENT: A. MORALES · MR# 884201</div>
              </div>
              <div className="divide-y hairline">
                {log.map((entry) => (
                  <LogRow key={entry.day} entry={entry} />
                ))}
              </div>
              <div className="px-5 py-3 border-t hairline bg-paper-warm/60 flex items-center justify-between text-[11px] text-ink-muted">
                <span>signed · hashed · ready to export</span>
                <span className="font-mono">sha256: 4a7b…91f0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogRow({ entry }: { entry: (typeof log)[number] }) {
  const isDeadline = entry.state === 'deadline';
  const isViolation = entry.state === 'violation';
  const bg = isViolation
    ? 'bg-seal/8'
    : isDeadline
    ? 'bg-paper-warm/60'
    : '';
  const accent = isViolation
    ? 'text-seal'
    : isDeadline
    ? 'text-ink'
    : 'text-ink-soft';

  return (
    <div className={`grid grid-cols-[68px_98px_1fr] gap-4 px-5 py-3 ${bg}`}>
      <div className={`font-medium ${accent}`}>{entry.day}</div>
      <div className="text-ink-muted">
        <div>{entry.date}</div>
        <div className="text-[11px]">{entry.time}</div>
      </div>
      <div>
        <div className={`font-semibold ${isViolation ? 'text-seal' : 'text-ink'}`}>
          {isViolation && '⚑ '}
          {entry.event}
        </div>
        <div className="text-ink-muted text-[12px] mt-0.5">{entry.detail}</div>
      </div>
    </div>
  );
}
