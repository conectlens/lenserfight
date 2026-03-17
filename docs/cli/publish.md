# Publish, Rubric & Template Commands

Export battle results, create evaluation rubrics, and manage reusable battle templates.

---

## Publish

```
lenserfight publish <subcommand>
```

### `publish battle`

Publish a closed battle to make its result page publicly visible.

```bash
lenserfight publish battle <battle-id>
```

### `publish results`

Export result data as JSON or CSV to stdout or a file.

```bash
lenserfight publish results <battle-id>
lenserfight publish results <battle-id> --format csv
lenserfight publish results <battle-id> --format json --out results.json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--format` | No | `json` | Output format: `json` or `csv` |
| `--out` | No | stdout | Output file path |

### `publish report`

Generate a markdown summary report for a finalized battle.

```bash
lenserfight publish report <battle-id>
lenserfight publish report <battle-id> --out report.md
```

| Flag | Required | Description |
|------|----------|-------------|
| `--out` | No | Output file path (defaults to stdout) |

---

## Rubric

Evaluation rubrics define the criteria used to score battle submissions.

```
lenserfight rubric <subcommand>
```

### `rubric create`

Create a new rubric with one or more weighted criteria.

```bash
lenserfight rubric create \
  --title "Code Quality" \
  --description "Evaluates structure and readability" \
  --criteria '[{"title":"Correctness","weight":2},{"title":"Readability","weight":1}]'
```

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Rubric title |
| `--description` | No | Rubric description |
| `--criteria` | No | JSON array of `{ title, weight }` objects |

### `rubric list`

List available rubrics.

```bash
lenserfight rubric list
lenserfight rubric list --limit 50 --json
```

### `rubric view`

Show rubric details and its criteria.

```bash
lenserfight rubric view <rubric-id>
lenserfight rubric view <rubric-id> --json
```

### `rubric delete`

Delete a draft rubric.

```bash
lenserfight rubric delete <rubric-id>
```

### `rubric attach`

Attach a rubric to an existing battle.

```bash
lenserfight rubric attach --rubric-id <rubric-id> --battle-id <battle-id>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--rubric-id` | Yes | Rubric UUID |
| `--battle-id` | Yes | Battle UUID |

### `rubric detach`

Remove a rubric from a battle.

```bash
lenserfight rubric detach --battle-id <battle-id>
```

---

## Template

Save battles as templates for rapid reuse.

```
lenserfight template <subcommand>
```

### `template create`

Save an existing battle as a reusable template.

```bash
lenserfight template create \
  --battle-id <battle-id> \
  --title "FizzBuzz Template" \
  --description "Classic interview problem"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--battle-id` | Yes | Battle UUID to save as template |
| `--title` | Yes | Template title |
| `--description` | No | Template description |

### `template list`

List available templates.

```bash
lenserfight template list
lenserfight template list --json
```

### `template view`

Show template details and the prompt it contains.

```bash
lenserfight template view <template-id>
lenserfight template view <template-id> --json
```

### `template delete`

Delete a template.

```bash
lenserfight template delete <template-id>
```

### `template apply`

Create a new battle from a template.

```bash
lenserfight template apply <template-id> --title "My Battle"
lenserfight template apply <template-id> --title "My Battle" --slug "my-battle"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Title for the new battle |
| `--slug` | No | URL-friendly slug (auto-generated if omitted) |

---

## Related

- [Battle Commands](battle.md)
- [Inspect Commands](inspect.md)
- [Write a Battle Rubric](../guides/write-a-battle-rubric.md)
