export default function About() {
  return (
    <section id="about" className="border-b hairline bg-paper-warm/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">§ 09</div>
            <h2 className="font-serif text-4xl lg:text-5xl mt-3 leading-tight tracking-tight font-semibold">
              About the project.
            </h2>
          </div>
          <div className="lg:col-span-8 space-y-6 text-ink-soft leading-relaxed">
            <p className="text-lg text-ink">
              OpenCharts is a small, volunteer-run project. There is no parent organization, no
              donation page, and no paid staff. Just a set of documents and a website, maintained
              in the open on GitHub.
            </p>
            <p>
              The maintainers work in patient-rights, healthcare, and software. We got tired of
              watching the 30-day deadline get treated as a polite suggestion. We publish under
              "the OpenCharts maintainers" rather than personal names; the project is the artifact,
              not the bios. If you need to reach a person, the project's GitHub Discussions is the
              right place, and we read every thread.
            </p>
            <p>
              If you want to help, contribute on GitHub: a state-specific records request
              template, a translation, a correction. If you found OpenCharts useful, the most
              useful thing you can do is tell another patient.
            </p>
            <p>
              Nothing on this site is legal advice. For your specific situation, talk to an
              attorney.
            </p>

            <div className="mt-8 pt-6 border-t hairline flex flex-wrap items-center gap-3 text-sm">
              <a
                href="https://github.com/afterimagelabs/opencharts/discussions"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                GitHub Discussions ↗
              </a>
              <a
                href="https://github.com/afterimagelabs/opencharts/issues/new?labels=correction"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-ink rounded-sm font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                Report an inaccuracy ↗
              </a>
              <span className="text-ink-muted px-2">License: MIT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
