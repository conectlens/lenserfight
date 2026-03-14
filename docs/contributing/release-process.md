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

Version bumps are determined by Conventional Commits (see [Branching and Versioning](/community/branching) for the commit taxonomy table and examples).

## Changelog

- `CHANGELOG.md` is updated as part of the release process (when releases are published).
- Do not manually add release entries unless maintainers request it.

See also:
- [Branching and Versioning](/community/branching)
