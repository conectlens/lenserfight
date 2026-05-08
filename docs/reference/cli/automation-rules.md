---
title: lf automation (rules)
description: CLI reference for the lf automation command tree — list, create, enable, disable, delete, history, and dry-run trigger rules.
---

# `lf automation` (rules)

Manages [trigger rules](/reference/automation/trigger-rule-schema) in the Phase U automation engine. For the older file-first markdown-object surface (`lf validate`, `lf import`, `lf export`), see [Automation CLI](/reference/cli/automation).

## Subcommands

| Command | Purpose |
|---|---|
| `lf automation list [--active-only] [--json]` | List rules you own |
| `lf automation create --file <path>.json` | Create a rule from a JSON file |
| `lf automation enable <id>` | Activate a disabled rule |
| `lf automation disable <id>` | Deactivate without deleting |
| `lf automation delete <id> --force` | Permanently delete |
| `lf automation history <id> [--limit 25]` | Show recent dispatch outcomes |
| `lf automation test --file <path>.json --event '<json>'` | Local dry-run — no RPC |

---

### `list`

```bash
lf automation list
lf automation list --active-only
lf automation list --json
```

Reads `automation.trigger_rules` filtered by the calling user. Output columns: `Rule ID | Name | Event | Action | Active | Created`. With `--json`, prints raw rows.

---

### `create`

```bash
lf automation create --file rule.json
```

Validates the file, INSERTs into `automation.trigger_rules`, and prints `{ rule_id, name }`. The full schema is documented in [Trigger rule schema](/reference/automation/trigger-rule-schema).

Errors:

- `Invalid action_kind: <value>` — must be one of `dispatch_workflow`, `webhook`, `notify`.
- `Invalid filter clause at <path>` — the value must be a single-key object whose key is `eq`, `neq`, `gt`, `lt`, or `contains`.

---

### `enable` / `disable`

```bash
lf automation enable <rule-id>
lf automation disable <rule-id>
```

PATCHes `is_active`. The dispatcher skips disabled rules even if events arrive in the meantime.

---

### `delete`

```bash
lf automation delete <rule-id> --force
```

`--force` is required because the operation cascades dispatch history. Without `--force`, the CLI prints a confirmation prompt and aborts.

---

### `history`

```bash
lf automation history <rule-id>
lf automation history <rule-id> --limit 50
```

Reads `automation.event_dispatches` for the rule, ordered by `attempted_at DESC`. `--limit` is clamped to `[1, 100]`; default `25`. Columns: `Event ID | Status | Attempted | Error`.

---

### `test`

```bash
lf automation test \
  --file rule.json \
  --event '{"event_type":"battle.finalized","payload":{"winner_contender_id":"..."}}'
```

Dry-runs the rule against a synthetic event entirely client-side. No network call. Useful for validating filter logic before persisting a rule. Output is one of:

- `WOULD FIRE — rule "<name>" matches event type <type>`
- `NO MATCH — event_type <type> does not match (<expected>)`
- `NO MATCH — clause <pointer> failed: <op>(<expected>)`

---

## Related

- [Event bus architecture](/explanation/automation/event-bus-architecture)
- [Trigger rule schema](/reference/automation/trigger-rule-schema)
- [Build your first trigger](/how-to/automation/build-your-first-trigger)
