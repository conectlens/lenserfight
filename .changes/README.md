# Changelog fragments

Every user-facing pull request adds one file here: `.changes/<pr-number>.md`. It is the
**only** source of prose for the Product Changelog (`/en/changelog`) and for the
`category`/`userImpact`/`verification` fields shown on the Main Branch Activity ledger
(`/en/changelog/main`). Commit messages are never parsed for public prose — see
`docs/en/explanation/changelog-system.md` for why.

## Format

```yaml
---
category: feat            # feat | fix | security | deprecation | breaking | perf | docs | internal
scope: web                 # web | mobile | cli | api | sdk | gateway | supabase | docs | infra
summary: Short user-facing sentence for the changelog list.
userImpact: What a user can now do, or what stopped breaking, in plain language.
breaking: false
migration: null            # required, non-empty string when breaking: true
docsImpact: none           # none | updated | needs-update
knownLimitations: null
verification:
  tests: "vitest: +3 in export.spec.ts"
  ci: null
---
Optional longer body. Rendered as the changelog entry's expanded description.
```

Schema: [`schema.json`](./schema.json) (validated by `tools/changelog` and by
`.github/workflows/changelog-gate.yml`).

## `category: internal`

Use this when the change has no product-facing effect but still needs to be tracked
(refactors, CI, test-only changes). Internal entries appear on the Main Branch Activity
ledger labeled `Internal` and are excluded from the Product Changelog.

## Opting out entirely

PRs with genuinely no user-visible or noteworthy effect (typo fixes, dependency bumps
with no behavior change) may skip the fragment by adding the `changelog:none` label
**and** an HTML comment in the PR description with a reason:

```html
<!-- changelog:none-reason: typo fix in a code comment, no behavior change -->
```

Both the label and the reason comment are required — the CI gate rejects one without
the other. See `.github/workflows/changelog-gate.yml`.

## How fragments are used

- `tools/changelog` aggregates all fragments on `main` that haven't yet been cut into a
  release into the `Unreleased` section shown on `/en/changelog`.
- A maintainer runs `pnpm changelog:cut <version>` to stamp the current `Unreleased`
  aggregation into a dated version section of `docs/en/changelog.md`
  (+ `docs/tr/changelog.md`) — this is a manual, human-curated step, not automatic.
- Fragments are **not deleted** after a release cut; they remain in git history as the
  evidence trail for that changelog entry (referenced by PR number from the rendered
  page).
