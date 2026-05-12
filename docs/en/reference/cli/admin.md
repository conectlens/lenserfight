---
title: lf admin
description: LenserFight platform administration commands.
---

<!-- AUTO-GEN-START -->

# `lf admin`

LenserFight platform administration commands. Requires an authenticated session with platform admin privileges.

## `lf admin vote-anomalies`

List vote manipulation anomalies detected by the platform's scoring integrity system.

| Flag | Type | Required | Default | Description |
|---|---|---|---|---|
| `--battle` | string | no | — | Filter anomalies by battle UUID |
| `--status` | string | no | `pending` | Filter by status: `pending`, `resolved`, or `all` |
| `--json` | boolean | no | `false` | Output raw JSON |

**Examples**

```bash
# List all pending vote anomalies
lf admin vote-anomalies

# Show anomalies for a specific battle
lf admin vote-anomalies --battle <battle-uuid>

# Show all anomalies including resolved ones as JSON
lf admin vote-anomalies --status all --json
```

**Output**

```
id         battle     voter      type         score  status   detected
12345678…  abcdef12…  99887766…  rapid_votes  87%    pending  5/12/2026
```

**Errors**

| Error | Cause | Fix |
|---|---|---|
| `Unauthorized` | Not logged in or insufficient privileges | Run `lf auth login` with an admin account |
| `RPC error` | Backend unreachable | Run `lf doctor --check api` |

<!-- AUTO-GEN-END -->

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | yes | Supabase anon key |

## Related Commands

- [`lf security rls-audit`](security.md) — database security audit
- [`lf battle`](battle.md) — manage battles
- [`lf report`](report.md) — generate reports
