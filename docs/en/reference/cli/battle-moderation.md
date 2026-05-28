---
title: Battle Moderation Commands
description: CLI reference for inspecting and overriding moderation decisions on owned battles.
---

# `lf battle-moderation`

Review the audit trail of moderation decisions made on battles you own, and override prior decisions (e.g. restore content the AI moderator removed).

Both subcommands route through Postgres RPCs that enforce ownership via RLS. You can only see and act on decisions for battles owned by your active workspace.

## `lf battle-moderation list`

List moderation decisions visible to the active workspace.

```bash
lf battle-moderation list
lf battle-moderation list --status flagged
lf battle-moderation list --status removed --limit 25
lf battle-moderation list --json
```

| Flag | Description |
|---|---|
| `--status <type>` | Filter by `flagged`, `approved`, `rejected`, `removed`, `restored`, or `warned`. Omit for all. |
| `--limit <n>` | Max rows. Default 50. |
| `--json` | Output as JSON. |

Output columns: `Decision ID | Battle | Type | AI? | Confidence | Occurred At`.

The `AI?` column reflects `is_ai_moderated`. `Confidence` is the raw AI confidence score for AI-driven decisions; `—` for human decisions.

## `lf battle-moderation override`

Override a prior decision. Records the override into the moderation audit trail.

```bash
lf battle-moderation override <decision-id> \
  --decision restored \
  --reason "False positive on benign content"
```

| Flag | Description |
|---|---|
| `<decision-id>` | Required. UUID of the moderation decision to override. |
| `--decision <type>` | Required. New decision type: `approved`, `rejected`, `removed`, `restored`. |
| `--reason <text>` | Required. Audit reason for the override. |

::: tip Audit retention
Overrides do not delete the original decision — they are appended to the audit trail and the new decision becomes the effective state.
:::

## Related

- [Battle Commands](battle.md)
- [Approval Commands](approval.md)

<!-- AUTO-GEN-START -->

# `lf battle-moderation`

Inspect and override moderation decisions on owned battles.

## `lf battle-moderation list`

List moderation decisions for battles owned by the active workspace.

| Flag | Type | Required | Description |
|---|---|---|---|
| `--status` | string | no | Filter by decision_type (flagged | approved | rejected | removed | restored | warned). |
| `--limit` | string | no | Max rows to return (default 50). |
| `--json` | boolean | no | Output as JSON |

## `lf battle-moderation override`

Override a prior moderation decision (e.g. restore an AI-removed battle).

| Flag | Type | Required | Description |
|---|---|---|---|
| `<decision-id>` | positional | yes | Moderation decision UUID to override |
| `--decision` | string | yes | New decision type: approved | rejected | removed | restored |
| `--reason` | string | yes | Reason for the override (audit trail) |

<!-- AUTO-GEN-END -->
