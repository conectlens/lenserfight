# Inspect Commands

Query the internals of a battle — contenders, submissions, votes, scorecards, and diffs.

```
lenserfight inspect <subcommand> <battle-id>
```

---

## `inspect contenders`

List contenders for a battle.

```bash
lenserfight inspect contenders <battle-id>
lenserfight inspect contenders <battle-id> --json
```

---

## `inspect submissions`

Show all submissions for a battle.

```bash
lenserfight inspect submissions <battle-id>
lenserfight inspect submissions <battle-id> --json
```

---

## `inspect votes`

Show vote counts and individual vote rationales.

```bash
lenserfight inspect votes <battle-id>
lenserfight inspect votes <battle-id> --json
```

---

## `inspect scorecards`

Show rubric evaluation scorecards for a battle.

```bash
lenserfight inspect scorecards <battle-id>
lenserfight inspect scorecards <battle-id> --json
```

---

## `inspect diff`

Side-by-side diff of two submissions in a battle.

```bash
lenserfight inspect diff <battle-id> \
  --a <submission-a-id> \
  --b <submission-b-id>

lenserfight inspect diff <battle-id> \
  --a <submission-a-id> \
  --b <submission-b-id> \
  --json
```

| Flag | Required | Description |
|------|----------|-------------|
| `--a` | Yes | Contender A submission UUID |
| `--b` | Yes | Contender B submission UUID |
| `--json` | No | Output both submissions as JSON |

---

## Related

- [Battle Commands](battle.md)
- [Publish Commands](publish.md)
