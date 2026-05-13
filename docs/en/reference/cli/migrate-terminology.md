---
title: lf migrate-terminology
description: Migrate legacy file-mode terminology (AGENT.md, WORKFLOW.md) to the canonical lensers/colenses vocabulary (LENSER.MD, COLENS.MD).
---

# `lf migrate-terminology`

Rewrite legacy file-mode terminology in any `.lenserfight/` tree from `AGENT.md` / `WORKFLOW.md` to the canonical `LENSER.MD` / `COLENS.MD`. Dry-run by default — nothing is touched unless you pass `--apply`.

```bash
lf migrate-terminology              # dry-run plan (default)
lf migrate-terminology --json       # plan as JSON
lf migrate-terminology --apply      # actually rewrite
```

---

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--apply` | `false` | Apply the migration. Without it, runs as dry-run. |
| `--json` | `false` | Emit the migration plan as JSON (exit code `1` if any operation is in conflict). |
| `--no-global` | `false` | Skip `~/.lenserfight` from the plan (project tree only). |
| `--no-recursive` | `false` | Do not recurse into nested `.lenserfight/` directories. |

By default the command discovers every `.lenserfight/` tree at or beneath the current working directory **and** `~/.lenserfight/`, plans rename + content rewrites, and prints a table.

---

## Output table

```
op       from             to                status
rename   AGENT.md         LENSER.MD         ok
rename   WORKFLOW.md      COLENS.MD         ok
rewrite  COLENS.MD        (terminology)     ok
skip     LENSER.MD        (already-canonical) skipped
conflict AGENT.md         LENSER.MD         conflict (both files exist)
```

- `ok` operations will be applied with `--apply`.
- `skipped` rows already use canonical terminology.
- `conflict` rows have both names present and must be resolved manually before running with `--apply`.

When `--json` is set, a non-zero exit code is returned if any `conflict` rows are present, making it safe to gate CI on.

---

## Examples

```bash
# Inspect what would change across the project + ~/.lenserfight
lf migrate-terminology

# Migrate only the project tree, recursively
lf migrate-terminology --no-global --apply

# Single-directory mode (no nested .lenserfight/ discovery)
lf migrate-terminology --no-recursive --apply

# CI gate — fail when conflicts exist
lf migrate-terminology --json --no-global > plan.json
```

---

## When to run this

- Adopting an older project that still ships `AGENT.md` / `WORKFLOW.md`.
- After importing third-party `.lenserfight/` packs.
- Before publishing — canonical terminology is required for `lf publish`.

The canonical vocabulary is set out in the [LenserFight file system reference](/en/lenserfight-file-system).

---

## Related

- [Lenserfight file system](/en/lenserfight-file-system)
- [`lf validate`](validate.md) — schema-validate canonical objects after migration
- [`lf import`](import.md) — register migrated objects in the local registry
