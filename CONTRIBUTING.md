# Contributing to LenserFight

Thanks for contributing.

This root file exists for GitHub community health features. The canonical contributor docs live under `docs/en/how-to/contributors/`.

## Canonical docs

Canonical site (browse online): [https://docs.lenserfight.com](https://docs.lenserfight.com)

- Contributor guide: [docs.lenserfight.com/how-to/contributors/contributing](https://docs.lenserfight.com/how-to/contributors/contributing) — `docs/en/how-to/contributors/contributing.md`
- Development setup: [docs.lenserfight.com/how-to/contributors/development-setup](https://docs.lenserfight.com/how-to/contributors/development-setup) — `docs/en/how-to/contributors/development-setup.md`
- Your first PR: [docs.lenserfight.com/how-to/contributors/first-pr](https://docs.lenserfight.com/how-to/contributors/first-pr) — `docs/en/how-to/contributors/first-pr.md`
- Architecture map: [docs.lenserfight.com/how-to/contributors/architecture-map](https://docs.lenserfight.com/how-to/contributors/architecture-map) — `docs/en/how-to/contributors/architecture-map.md`
- Coding standards: [docs.lenserfight.com/how-to/contributors/coding-standards](https://docs.lenserfight.com/how-to/contributors/coding-standards) — `docs/en/how-to/contributors/coding-standards.md`
- Branching and versioning: [docs.lenserfight.com/how-to/contributors/branching](https://docs.lenserfight.com/how-to/contributors/branching) — `docs/en/how-to/contributors/branching.md`
- Release process: [docs.lenserfight.com/how-to/contributors/release-process](https://docs.lenserfight.com/how-to/contributors/release-process) — `docs/en/how-to/contributors/release-process.md`
- CLI release guide: [docs.lenserfight.com/how-to/contributors/cli-release](https://docs.lenserfight.com/how-to/contributors/cli-release) — `docs/en/how-to/contributors/cli-release.md`
- Code of conduct: [docs.lenserfight.com/how-to/contributors/code-of-conduct](https://docs.lenserfight.com/how-to/contributors/code-of-conduct) — `docs/en/how-to/contributors/code-of-conduct.md`
- Support routing: [docs.lenserfight.com/how-to/contributors/support](https://docs.lenserfight.com/how-to/contributors/support) — `docs/en/how-to/contributors/support.md`
- Security reporting: [docs.lenserfight.com/how-to/contributors/security](https://docs.lenserfight.com/how-to/contributors/security) — `docs/en/how-to/contributors/security.md`
- Translations & i18n: [docs.lenserfight.com/how-to/contributors/i18n-guide](https://docs.lenserfight.com/how-to/contributors/i18n-guide) — `docs/en/how-to/contributors/i18n-guide.md`
- Adding a new language: [docs.lenserfight.com/how-to/contributors/adding-a-language](https://docs.lenserfight.com/how-to/contributors/adding-a-language) — `docs/en/how-to/contributors/adding-a-language.md`
- Brand / trademark: [BRAND.md](BRAND.md) in the repo root

## Maintainer triage labels

- `p0-install`
- `p0-workflow`
- `docs`
- `good first issue`
- `deferred`

## Quick start

Three commands to get a working local environment:

```bash
git clone https://github.com/conectlens/lenserfight && cd lenserfight
./scripts/dev-start.sh          # starts Supabase local + Vite dev server
pnpm smoke                      # validates build, migrations, and pgTAP suite
```

Full setup detail: [docs/en/how-to/contributors/development-setup.md](docs/en/how-to/contributors/development-setup.md)

## Where to start

1. Browse issues labeled **`good first issue`** — these are scoped to ≤2 files and have acceptance criteria.
2. Check the [project board](https://github.com/orgs/conectlens/projects) for in-progress and backlog items.
3. For questions, open a GitHub Discussion or join the Discord linked in the repo description.

If you want to build something that isn't tracked yet, open a **Feature request** issue first. This avoids duplicate work and lets maintainers flag any conflicting migrations before you invest time.

## Test philosophy

LenserFight has two testing layers that serve different purposes:

**pgTAP — database layer**

All Supabase schema invariants, RLS policies, trigger behavior, and RPC correctness are verified with pgTAP tests in `supabase/tests/`. Run them with:

```bash
pnpm run-pgtap
```

Each test file uses `SELECT plan(N)` — check the plan count matches the assertions before opening a PR.

**Vitest — TypeScript layers**

Feature components, hooks, and utilities use Vitest. Always run tests for the specific project you changed:

```bash
pnpm nx test <project> --testFile=path/to/file.spec.ts
```

Never run `pnpm nx test cli` without `--testFile` — the CLI test suite includes integration specs that time out on most developer machines.

## Contribution license and safety expectations

Unless you explicitly state otherwise, contributions intentionally submitted to this repository are provided under the repository license, currently Apache-2.0. Do not submit code, docs, prompts, templates, media, generated output, or data that you do not have the right to contribute.

Do not include secrets, private keys, provider credentials, customer data, regulated data, private prompts, non-public third-party content, or exploit details in issues, pull requests, examples, screenshots, logs, or generated fixtures. Report vulnerabilities privately through [SECURITY.md](SECURITY.md).

Maintainers should consider adding a DCO sign-off or CLA only if contribution provenance becomes hard to audit or commercial relicensing is planned. Until then, Apache-2.0 section 5 plus clear PR provenance expectations are the lightweight baseline.

## PR checklist

Before opening a pull request, verify:

- [ ] `pnpm smoke` exits 0 (or `pnpm nx build cli && pnpm nx run web:build` for UI-only changes)
- [ ] Any migration is in a new file under `supabase/migrations/` — do **not** edit existing migrations
- [ ] New migration has a matching pgTAP test (or a comment explaining why it doesn't need one)
- [ ] `pnpm run-pgtap` passes against the new migration
- [ ] No direct SQL changes to already-migrated tables without a migration file
- [ ] Public library API changes are reflected in the lib's `src/index.ts`
- [ ] Screenshots included for UI changes
- [ ] No secrets, private data, or unsupported legal/security/privacy claims were added
- [ ] Agent, workflow, BYOK, provider, or automation changes document cost, permission, privacy, and misuse risks

## Code of conduct

This project follows the [Contributor Covenant](docs/en/how-to/contributors/code-of-conduct.md). Be kind, be specific, assume good faith.
