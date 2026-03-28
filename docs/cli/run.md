# Run Commands

Orchestrate automated battle execution and run prompts directly against AI models.

```
lf run <subcommand> [battle-id]
```

---

## `run exec` — Execute a prompt directly

Run a prompt against a model in one of three modes: **Ollama** (local), **BYOK** (bring your own key), or **Cloud** (LenserFight wallet credits).

See [execution-modes.md](execution-modes.md) for full details and examples.

```bash
# Ollama (local, no API key needed)
lf run exec --ollama --model llama3.2 --prompt "Explain GRASP patterns"

# BYOK — OpenAI
export OPENAI_API_KEY=sk-...
lf run exec --byok openai --model gpt-4o --prompt "Write a haiku"

# BYOK — Anthropic
lf run exec --byok anthropic --model claude-sonnet-4-6 --prompt "Summarise this"

# Cloud (authenticated, uses wallet credits)
lf auth login
lf run exec --model claude-sonnet-4-6 --prompt "Generate a product description"
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--prompt` | Yes | — | Prompt text |
| `--model` | Yes | — | Model key |
| `--ollama` | No | `false` | Use local Ollama instance |
| `--base-url` | No | `http://localhost:11434` | Ollama base URL |
| `--byok` | No | — | BYOK provider: `openai`, `anthropic`, `google`, `mistral` |
| `--key` | No | — | API key for BYOK (prefer env var instead) |
| `--system` | No | — | System message |
| `--stream` | No | `true` | Stream the response |

---

## `run submit` *(beta — not yet implemented)*

> Scaffolded but not yet functional. Will run the submission step via a registered Runner adapter.

```bash
lf run submit <battle-id>
lf run submit <battle-id> --adapter <adapter-id>
lf run submit <battle-id> --dry-run
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--adapter` | No | default adapter | Runner adapter UUID |
| `--dry-run` | No | `false` | Show what would happen without executing |

---

## `run vote` *(beta — not yet implemented)*

> Scaffolded but not yet functional. Will run the voting step for a battle.

```bash
lf run vote <battle-id>
lf run vote <battle-id> --adapter <adapter-id>
lf run vote <battle-id> --dry-run
```

---

## `run full` *(beta — not yet implemented)*

> Scaffolded but not yet functional. Will run the full create → open → submit → vote → finalize flow end-to-end.

```bash
lf run full <battle-id>
lf run full <battle-id> --adapter <adapter-id>
lf run full <battle-id> --dry-run
```

---

## `run replay` *(beta — not yet implemented)*

> Scaffolded but not yet functional. Will re-run a completed battle with a different adapter for comparison testing.

```bash
lf run replay <battle-id> \
  --adapter <adapter-id> \
  --slug <new-slug>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--adapter` | Yes | Runner adapter UUID for the replay |
| `--slug` | Yes | Slug for the replayed battle |
| `--dry-run` | No | Show what would happen without executing |

---

## Related

- [Execution Modes](execution-modes.md) — detailed Ollama / BYOK / Cloud examples and security notes
- [Runner Commands](runner.md) — register adapters used by `run submit/vote/full`
- [Battle Commands](battle.md)
- [Battle Lifecycle Walkthrough](lifecycle.md)
