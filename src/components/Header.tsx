import { useState } from 'react';

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#the-law', label: 'The law' },
  { href: '#penalties', label: 'Penalties' },
  { href: '#for-providers', label: 'For providers' },
  { href: '#start', label: 'Get started' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b hairline bg-paper/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <a href="#top" className="flex items-center gap-2.5 group min-w-0">
          <Mark />
          <div className="leading-none min-w-0">
            <div className="font-serif text-lg font-semibold tracking-tight truncate">OpenCharts</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted mt-0.5 truncate">
              A public-interest project
            </div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-seal transition-colors">
              {l.label}
            </a>
          ))}
          <a
            href="https://github.com/afterimagelabs/opencharts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-ink rounded-full text-xs font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            <GitHubIcon />
            <span>GitHub</span>
          </a>
        </nav>

        {/* Mobile menu trigger */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-sm border border-ink hover:bg-ink hover:text-paper transition-colors shrink-0"
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t hairline bg-paper"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto max-w-6xl px-5 py-3 flex flex-col">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 border-b hairline text-base hover:text-seal transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="https://github.com/afterimagelabs/opencharts"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-2 self-start px-3 py-2 border border-ink rounded-full text-sm font-medium hover:bg-ink hover:text-paper transition-colors"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="3" stroke="#15171a" strokeWidth="1.5" />
      <path d="M9 11h14M9 16h14M9 21h9" stroke="#15171a" strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="24" cy="22" r="4" fill="#7a1f1f" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.5 3.18-1.18 3.18-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56C20.22 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
