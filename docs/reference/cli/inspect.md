# Inspect Commands

Query the internals of an evaluation — contenders, submissions, votes, scorecards, and diffs.

```
lenserfight inspect <subcommand> <evaluation-id>
```

---

## `inspect contenders`

List contenders for an evaluation.

```bash
lenserfight inspect contenders <evaluation-id>
lenserfight inspect contenders <evaluation-id> --json
```

---

## `inspect submissions`

Show all submissions for an evaluation.

```bash
lenserfight inspect submissions <evaluation-id>
lenserfight inspect submissions <evaluation-id> --json
```

---

## `inspect votes`

Show vote counts and individual vote rationales.

```bash
lenserfight inspect votes <evaluation-id>
lenserfight inspect votes <evaluation-id> --json
```

---

## `inspect scorecards`

Show rubric evaluation scorecards for an evaluation.

```bash
lenserfight inspect scorecards <evaluation-id>
lenserfight inspect scorecards <evaluation-id> --json
```

---

## `inspect diff`

Side-by-side diff of two submissions in an evaluation.

```bash
lenserfight inspect diff <evaluation-id> \
  --a <submission-a-id> \
  --b <submission-b-id>

lenserfight inspect diff <evaluation-id> \
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

- [Run Commands](run.md)
- [Publish Commands](publish.md)
