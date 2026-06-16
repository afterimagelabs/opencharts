# OpenCharts

> Hold your providers to the 30-day rule.

OpenCharts is a free, open-source toolkit to help patients in the United States exercise their HIPAA right of access, and to document every step when providers stall past the 30-day deadline.

Under the [HIPAA Privacy Rule](https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.524) (45 CFR § 164.524), every patient has the right to receive their own medical records within 30 days of asking. When they don't, an audit trail is what makes the right enforceable.

This repository hosts the project website ([opencharts.org](https://opencharts.org)). Over time it will also host the artifacts: the request letter, the audit log template, and the pre-filled HHS OCR complaint.

## Status

Early. The site is up; the downloadable artifacts are next.

## Development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # writes static site to dist/
npm run preview      # serve dist/ locally
```

Built with [Vite](https://vitejs.dev), [React](https://react.dev), and [Tailwind CSS](https://tailwindcss.com).

## Deploying

The site deploys to Cloudflare Pages on every push to `main`.

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output:** `dist`
- **Node version:** 20 (pinned via `.nvmrc`)

## Contributing

Issues, pull requests, and translations are welcome. Legal-research issues are tagged `law`, content issues `content`, design issues `design`.

## Disclaimer

OpenCharts is a public-interest project. It is not a law firm, and nothing here is legal advice. For your specific situation, talk to an attorney.

## License

MIT. See [LICENSE](./LICENSE).
