# LenserFight

LenserFight is a TypeScript Nx monorepo for a Vite-based web application backed by Supabase, plus a VitePress documentation site.

## What is in this repository

- `apps/` contains runnable applications such as the web app and docs site.
- `libs/` contains shared code for domain, data, UI, and utilities.
- `docs/` contains the markdown source rendered by the docs site.
- `supabase/` contains Supabase configuration and migrations when present.

## Repository structure

```text
.
├─ apps/
│  ├─ web/
│  └─ docs/
├─ libs/
├─ docs/
├─ supabase/
└─ README.md
```

## Quick start

### Prerequisites

- Node.js 20
- npm
- A Supabase project, either local or cloud-hosted

### Install dependencies

```bash
npm ci
```

### Configure environment variables

Copy `.env.example` to `.env` and set the required application values for Supabase, the app base URL, and any public client-side keys.

### Run the web app

```bash
npm exec nx serve web
```

### Run the docs site

```bash
npm exec nx run docs:serve
```

## Documentation and community

- Docs site: `https://docs.lenserfight.com`
- Docs entry page: `docs/index.md`
- Installation guide: `docs/tutorials/installation.md`
- Quickstart guide: `docs/tutorials/quickstart.md`
- Contributing guide: `CONTRIBUTING.md` or `docs/community/contributing.md`
- Code of conduct: `CODE_OF_CONDUCT.md` or `docs/community/code-of-conduct.md`
- Security policy: `SECURITY.md` or `docs/community/security.md`
- Support guide: `SUPPORT.md` or `docs/community/support.md`

## License

No open-source license has been selected yet. Until a `LICENSE` file is added, assume the source code and documentation are not licensed for reuse.
