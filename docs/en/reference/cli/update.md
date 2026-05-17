---
title: lf update
description: Check for CLI updates and print upgrade instructions.
---

# `lf update`

Check whether a newer version of the LenserFight CLI is available and print the correct upgrade command for your package manager.

## Usage

```sh
lf update
```

## Options

| Flag | Type | Default | Description |
|---|---|---|---|
| `--check` | boolean | `false` | Only check and report; do not print install commands |
| `--json` | boolean | `false` | Output result as JSON |

## Examples

```sh
# Interactive — shows update banner and install command
lf update

# CI-friendly — exits 0 always, result in JSON
lf update --json

# Only verify you are up to date
lf update --check
```

## How it works

1. Reads the installed version from the bundled `package.json`.
2. Queries the npm registry (`registry.npmjs.org/@lenserfight/cli/latest`) with a 5-second timeout.
3. Compares versions using semver. If the registry version is newer, it prints the appropriate update command.
4. Caches the registry response in `~/.lenserfight/update-check.json` for 24 hours to avoid repeated network calls.

## Update commands by package manager

The CLI detects your package manager automatically:

```sh
# npm global install
npm install -g @lenserfight/cli@latest

# pnpm global install
pnpm add -g @lenserfight/cli@latest

# yarn global install
yarn global add @lenserfight/cli@latest
```

## Release channels

| Channel | npm tag | Who should use it |
|---|---|---|
| `stable` | `latest` | Production use; recommended for most users |
| `beta` | `beta` | Pre-release feature testing |
| `rc` | `rc` | Release candidates before stable |
| `nightly` | `nightly` | Bleeding-edge; may contain regressions |

`lf update` always recommends the latest **stable** release. To install a pre-release channel:

```sh
npm install -g @lenserfight/cli@beta
npm install -g @lenserfight/cli@rc
npm install -g @lenserfight/cli@nightly
```

## Background update hint

After every command, the CLI checks the cache and prints a one-line hint to `stderr` if a newer version is available:

```
  ╭─────────────────────────────────────────────────────╮
  │  Update available: v0.10.0-alpha.2 → v0.11.0        │
  │  Run `lf update` for upgrade instructions.          │
  ╰─────────────────────────────────────────────────────╯
```

The hint:
- Only appears when the cache already contains a newer version — it does **not** make a network call on every command.
- Writes to `stderr`, never `stdout`, so scripts and `--json` output are unaffected.
- Is suppressed in `--local` mode and when `LF_NO_UPDATE_CHECK=1`.

## Suppress update checks

```sh
# Per-invocation
lf --local <command>

# Process-wide
LF_NO_UPDATE_CHECK=1 lf <command>
```

## Invalidate the cache

Delete the cache file to force an immediate check on the next command:

```sh
rm ~/.lenserfight/update-check.json
```

## After updating

Run `lf doctor` to verify your environment is healthy:

```sh
lf doctor
```

## JSON output schema

```json
{
  "current": "0.2.0",
  "latest": "0.3.0",
  "hasUpdate": true
}
```

When the registry is unreachable:

```json
{
  "current": "0.2.0",
  "latest": null,
  "hasUpdate": false
}
```

## Security

- The CLI **never executes shell commands** on your behalf. It only prints the update command for you to run.
- Registry requests use HTTPS and a strict 5-second abort timeout.
- The cache file contains only version strings and a timestamp — no credentials, no personal data.

---

## Related

- [`lf doctor`](doctor.md) — validate environment health after upgrading
- [`lf whats-new`](whats-new.md) — print recent changelog entries
- [`lf status`](status.md) — show current auth and environment state

<!-- AUTO-GEN-START -->

# `lf update`

Check for CLI updates and print upgrade instructions.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--check` | boolean | no | Only check and print the result; do not print install commands |
| `--json` | boolean | no | Output result as JSON |

<!-- AUTO-GEN-END -->
