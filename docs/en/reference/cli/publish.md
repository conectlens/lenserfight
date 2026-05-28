# Publish, Rubric & Template Commands

Export evaluation results, create evaluation rubrics, and manage reusable templates.

---

## Publish

```
lenserfight publish <subcommand>
```

### `publish results`

Export result data as JSON or CSV to stdout or a file.

```bash
lenserfight publish results <evaluation-id>
lenserfight publish results <evaluation-id> --format csv
lenserfight publish results <evaluation-id> --format json --out results.json
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--format` | No | `json` | Output format: `json` or `csv` |
| `--out` | No | stdout | Output file path |

### `publish report`

Generate a markdown summary report for a finalized evaluation.

```bash
lenserfight publish report <evaluation-id>
lenserfight publish report <evaluation-id> --out report.md
```

| Flag | Required | Description |
|------|----------|-------------|
| `--out` | No | Output file path (defaults to stdout) |

---

## Rubric

Evaluation rubrics define the criteria used to score submissions.

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

Attach a rubric to an existing evaluation.

```bash
lenserfight rubric attach --rubric-id <rubric-id> --evaluation-id <evaluation-id>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--rubric-id` | Yes | Rubric UUID |
| `--evaluation-id` | Yes | Evaluation UUID |

### `rubric detach`

Remove a rubric from an evaluation.

```bash
lenserfight rubric detach --evaluation-id <evaluation-id>
```

---

## Template

Save evaluations as templates for rapid reuse.

```
lenserfight template <subcommand>
```

### `template create`

Save an existing evaluation as a reusable template.

```bash
lenserfight template create \
  --evaluation-id <evaluation-id> \
  --title "FizzBuzz Template" \
  --description "Classic interview problem"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--evaluation-id` | Yes | Evaluation UUID to save as template |
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

Create a new evaluation from a template.

```bash
lenserfight template apply <template-id> --title "My Evaluation"
lenserfight template apply <template-id> --title "My Evaluation" --slug "my-evaluation"
```

| Flag | Required | Description |
|------|----------|-------------|
| `--title` | Yes | Title for the new evaluation |
| `--slug` | No | URL-friendly slug (auto-generated if omitted) |

---

## Related

- [Inspect Commands](inspect.md)
- [Run Commands](run.md)

<!-- AUTO-GEN-START -->

# `lf publish`

Publish battle results and artifacts: battle, results, report.

<!-- AUTO-GEN-END -->
