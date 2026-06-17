export default function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <Mark />
              <div>
                <div className="font-serif text-xl font-semibold">OpenCharts</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mt-0.5">
                  A public-interest project
                </div>
              </div>
            </div>
            <p className="mt-6 text-paper/70 leading-relaxed text-sm max-w-md">
              A free, open-source records-request service to help patients exercise their HIPAA
              right of access and hold providers to the 30-day deadline. Nothing on this site is
              legal advice.
            </p>
            <p className="mt-4 text-paper/55 text-xs">
              Maintained by the OpenCharts maintainers · source on{' '}
              <a
                href="https://github.com/afterimagelabs/opencharts"
                className="underline underline-offset-4 hover:text-paper"
              >
                GitHub
              </a>
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-paper/50">Project</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a className="hover:text-paper/100 text-paper/80" href="#the-law">The law</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="#penalties">Penalties</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="#start">Get started</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="#about">About</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="https://github.com/afterimagelabs/opencharts">GitHub</a></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.22em] text-paper/50">Resources</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a className="hover:text-paper/100 text-paper/80" href="https://www.hhs.gov/hipaa/for-individuals/right-to-access/index.html" target="_blank" rel="noreferrer">HHS right of access</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="https://www.hhs.gov/hipaa/filing-a-complaint/index.html" target="_blank" rel="noreferrer">File an OCR complaint</a></li>
              <li><a className="hover:text-paper/100 text-paper/80" href="https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.524" target="_blank" rel="noreferrer">45 CFR § 164.524</a></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-paper/50">Contact</div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="text-paper/80">
                Issues & contributions:{' '}
                <a href="https://github.com/afterimagelabs/opencharts/issues" className="underline underline-offset-4">
                  on GitHub
                </a>
              </li>
              <li className="text-paper/80">
                Discussions:{' '}
                <a href="https://github.com/afterimagelabs/opencharts/discussions" className="underline underline-offset-4">
                  GitHub Discussions
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-paper/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-paper/55">
          <div>
            © {new Date().getFullYear()} The OpenCharts Project · Documents released under the MIT License.
          </div>
          <div className="font-mono">
            v0.1.0 · build {new Date().toISOString().slice(0, 10)}
          </div>
        </div>
      </div>
    </footer>
  );
}

function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="3" y="3" width="26" height="26" rx="3" stroke="#fbfaf6" strokeWidth="1.5" />
      <path d="M9 11h14M9 16h14M9 21h9" stroke="#fbfaf6" strokeWidth="1.5" strokeLinecap="square" />
      <circle cx="24" cy="22" r="4" fill="#7a1f1f" />
    </svg>
  );
}
