# Release Process

This guide documents how releases are produced. Contributors should generally focus on PRs to `development`; maintainers handle release merges and publishing.

## Branches and release source of truth

- `development` is the default integration branch for community PRs.
- `main` is release-only.

## How a release happens (maintainers)

1. Maintainers merge `development` → `main` when ready.
2. CI runs `semantic-release` on pushes to `main`.
3. Releases are published via Git tags and GitHub Releases (when enabled).

Configuration lives in:
- `.github/workflows/release.yml`
- `.releaserc`

## Versioning rules

Version bumps are determined by Conventional Commits (see [Branching and Versioning](/en/how-to/contributors/branching) for the commit taxonomy table and examples).

## Changelog

- `CHANGELOG.md` is updated as part of the release process (when releases are published).
- For **pre-release / first-public** milestones, maintainers may add a dated entry when cutting a manual tag before automation is fully wired; keep entries aligned with root `package.json` `version`.

## First public GitHub Release (paste template)

Use when publishing **`v0.10.0-alpha.2`** (or the current `package.json` version) for the first Apache-2.0 Community Edition line:

```markdown
## LenserFight Community Edition

**License:** Apache-2.0 — see the `LICENSE` file in this repository.

**Trademarks:** The LenserFight name and logos are governed separately.

**Docs:** https://docs.lenserfight.com

**Security:** Report vulnerabilities privately via GitHub Security Advisories (see `SECURITY.md`).

**Supported in this build:** lenses, workflows, local Supabase, `lf run exec`, connector adapter **alpha** (`@lenserfight/adapters/connector` in-repo). See README “Supported now / Not part of” for boundaries.

**Validation:** From a clean clone: `pnpm install --frozen-lockfile`, `pnpm smoke`, `pnpm check:oss-migration` (maintainers run before tagging).
```

Dry-run: push a test tag on a fork or use GitHub “Draft release” before marking latest.

See also:
- [Branching and Versioning](/en/how-to/contributors/branching)
