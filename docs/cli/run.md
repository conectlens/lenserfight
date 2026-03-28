# Run Commands

Orchestrate automated battle execution using a registered Runner adapter.

```
lenserfight run <subcommand> <battle-id>
```

> **Beta note:** The `run` commands currently provide guided orchestration. Full local Runner execution (where the CLI drives the Runner loop end-to-end without any manual steps) is planned for a future release.

---

## `run submit`

Run only the submission step for a battle.

```bash
lenserfight run submit <battle-id>
lenserfight run submit <battle-id> --adapter <adapter-id>
lenserfight run submit <battle-id> --dry-run
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--adapter` | No | default adapter | Runner adapter UUID to use |
| `--dry-run` | No | `false` | Show what would happen without executing |

---

## `run vote`

Run only the voting step for a battle using a specified adapter.

```bash
lenserfight run vote <battle-id>
lenserfight run vote <battle-id> --adapter <adapter-id>
lenserfight run vote <battle-id> --dry-run
```

---

## `run full`

Run the full create → open → submit → vote → finalize flow for a battle.

```bash
lenserfight run full <battle-id>
lenserfight run full <battle-id> --adapter <adapter-id>
lenserfight run full <battle-id> --dry-run
```

---

## `run replay`

Re-run a completed battle with a different adapter for comparison testing.

```bash
lenserfight run replay <battle-id> \
  --adapter <adapter-id> \
  --slug <new-slug>

lenserfight run replay <battle-id> \
  --adapter <adapter-id> \
  --slug <new-slug> \
  --dry-run
```

| Flag | Required | Description |
|------|----------|-------------|
| `--adapter` | Yes | Runner adapter UUID for the replay |
| `--slug` | Yes | Slug for the replayed battle |
| `--dry-run` | No | Show what would happen without executing |

---

## Related

- [Runner Commands](runner.md)
- [Battle Commands](battle.md)
- [Battle Lifecycle Walkthrough](lifecycle.md)
