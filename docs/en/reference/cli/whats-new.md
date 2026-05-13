---
title: lf whats-new
description: Print the most recent LenserFight release notes from CHANGELOG.md without leaving the terminal.
---

# `lf whats-new`

Print the most recent release entries from the repo's `CHANGELOG.md`. Each entry is the body of a top-level `## [version] - date` heading. The command walks upward from the CLI binary to find `CHANGELOG.md`, falling back to the current working directory and finally to the hosted changelog URL.

```bash
lf whats-new            # latest release
lf whats-new --n 3      # last 3 releases
lf whats-new --json     # structured output
```

---

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--n <N>` | `1` | Number of recent releases to show. Floored to at least 1. |
| `--json` | `false` | Emit `[{ version, date, body }]` as JSON instead of formatted text. |

---

## Behavior

1. Resolve `CHANGELOG.md` — relative to the CLI binary, or `process.cwd()`.
2. Parse releases by walking `## [version] - YYYY-MM-DD` headings.
3. Print body, truncating per-release at 40 lines with a "… (truncated)" marker.
4. Always print the hosted changelog link at the end.

If `CHANGELOG.md` cannot be located, the command prints only the hosted link and exits `0`.

---

## Examples

```bash
# Day-to-day: what shipped most recently?
lf whats-new

# Scripted: programmatic access to the latest 5 releases
lf whats-new --n 5 --json | jq '.[].version'
```

---

## Related

- [Changelog](/changelog) — the canonical, hosted release log
- [Incident response](/en/how-to/operations/incident-response) — the operational playbook these release notes feed into
