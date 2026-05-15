---
title: CLI Release Guide
description: How maintainers validate, publish, verify, and roll back the LenserFight npm CLI package.
layout: doc
---

# CLI Release Guide

This guide covers the npm release system for `apps/cli`, published as `lenserfight`.

The release path is intentionally narrow:

- Source package: `apps/cli/package.json`
- Build output: `dist/apps/cli`
- Nx project: `cli`
- npm package: `lenserfight`
- Git tag pattern: `cli@<version>`
- Release workflow: `.github/workflows/release-cli.yml`
- Package validation workflow: `.github/workflows/cli-package.yml`

## Install Surfaces

Every release must support:

```bash
npm install -g lenserfight
npx lenserfight --version
npm install --save-dev lenserfight
```

The package exposes both `lenserfight` and `lf` bins. The production artifact is a bundled CommonJS Node executable with a shebang and Node `>=22`.

## Versioning

Releases use SemVer and Nx Release conventional-commit analysis.

Supported channels:

| Channel | npm dist-tag | Version shape | Branches |
|---------|--------------|---------------|----------|
| Stable | `latest` | `1.2.3` | `main` |
| Beta | `beta` | `1.2.3-beta.1` | `main`, `development`, `release/*` |
| RC | `rc` | `1.2.3-rc.1` | `main`, `release/*` |
| Nightly | `nightly` | `1.2.3-nightly.1` | `main`, `development` |

Use Conventional Commits:

- `fix(cli): ...` -> patch
- `feat(cli): ...` -> minor
- `feat(cli)!: ...` or `BREAKING CHANGE:` -> major
- `docs(cli): ...`, `test(cli): ...`, `chore(cli): ...` -> changelog context, usually no release by themselves

Major releases require `allow_major=true` in the release workflow. This prevents accidental major bumps from a mistaken commit footer.

## Release Preview

Run a dry release before every publish:

1. Open **Actions -> Release CLI**.
2. Select the channel and version specifier.
3. Keep `dry_run=true`.
4. Run the workflow from the intended branch.

The preview runs tests, builds the CLI, validates the tarball contents, smoke-installs the package, previews Nx version/changelog output, runs `npm publish --dry-run`, and uploads artifacts.

## Publish

After the dry run is clean:

1. Re-run **Release CLI** with the same channel.
2. Set `dry_run=false`.
3. Use `first_release=true` only for the first public CLI release.
4. For stable releases, approve the `npm-production` environment.

The workflow:

1. Installs with `pnpm install --frozen-lockfile`.
2. Runs `pnpm nx run cli:test --ci`.
3. Runs `pnpm nx run cli:smoke-install`.
4. Versions `apps/cli/package.json` through Nx Release.
5. Generates `apps/cli/CHANGELOG.md`.
6. Rebuilds, validates, and smoke-installs the versioned package.
7. Generates a CycloneDX SBOM.
8. Commits the version/changelog and tags `cli@<version>`.
9. Publishes `dist/apps/cli` to npm with `--provenance`.
10. Verifies the package from npm with `npm view` and `npm exec`.
11. Creates a GitHub Release with the tarball, SBOM, and validation reports.

## Required Secrets and Environments

Prefer npm Trusted Publishing for `lenserfight`. Configure npm to trust this repository and the `release-cli.yml` workflow, then remove the fallback token once the trusted flow is confirmed.

Fallback secret:

| Secret | Scope | Notes |
|--------|-------|-------|
| `NPM_TOKEN` | `npm-production` and `npm-prerelease` environments | npm automation token with publish permission for `lenserfight` |

Environment policy:

- `npm-production`: restricted to maintainers, required approval for stable releases.
- `npm-prerelease`: maintainers only, approval optional but recommended.
- `GITHUB_TOKEN`: provided by GitHub, limited to `contents: write` and `id-token: write`.

Rotate `NPM_TOKEN` after maintainer changes, suspected exposure, or failed release attempts with unclear logs. Never echo npm config or tokens in workflow steps.

## Package Gates

`pnpm nx run cli:validate-package` fails when:

- `main.js` is missing, lacks a shebang, or is not executable.
- `package.json` is private, missing bin aliases, missing Node `>=22`, or has an invalid version.
- `--version` does not match the package version.
- `--help` does not start successfully.
- The npm tarball contains sources, maps, lockfiles, configs, secrets, certificates, local paths, internal tool folders, or unexpected files.
- The package exceeds the size guardrails.

`pnpm nx run cli:smoke-install` verifies:

- `npm exec --package <tarball> lenserfight --version`
- local project install and `lf --version`
- global install and `lenserfight --version`

The CI matrix runs these checks on Linux, macOS, and Windows.

## Rollback

npm packages are immutable. Rollback means moving traffic away from a bad version.

1. Identify the previous known-good version:

```bash
npm view lenserfight versions --json
npm dist-tag ls lenserfight
```

2. Move the affected tag:

```bash
npm dist-tag add lenserfight@<previous-version> latest
```

For prereleases, replace `latest` with `beta`, `rc`, or `nightly`.

3. Deprecate the bad version:

```bash
npm deprecate lenserfight@<bad-version> "Use <previous-version>; this release was withdrawn."
```

4. Update the GitHub Release with the rollback note.
5. Open a hotfix branch from `main`, fix forward, run a dry release, then publish a new patch.

Do not delete git tags unless the package was never published. If a tag points to a published npm version, keep it for provenance and auditability.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `--version` is stale | Confirm `apps/cli/src/main.ts` reads `apps/cli/package.json`; rebuild with `pnpm nx run cli:build`. |
| npm publish says version exists | The package already published. Bump version or move the dist-tag only. |
| Provenance fails | Check `id-token: write`, npm trusted publishing settings, and the `NPM_TOKEN` fallback. |
| Package validation blocks a file | Inspect `npm pack --dry-run --json dist/apps/cli`; update `files` in `apps/cli/package.json` only if the file is intentionally public. |
| Windows smoke test fails | Check bin shims and avoid POSIX-only assumptions in release scripts. |

## Future Distribution

The current system is ready for:

- scoped package split, for example `@lenserfight/cli`
- plugin packages released with separate Nx project tags
- Homebrew formula generation from GitHub Releases
- Docker images built from the npm tarball
- standalone binaries added as extra release assets
- enterprise/private registry publishing through a separate release environment
