# Run Commands

The `lf run` command family has one launch-ready path in Community Edition today: `lf run exec`.

The other subcommands remain preview scaffolds until the full automation flow exists end to end.

```bash
lf run <subcommand>
```

---

## `run exec` - supported

Execute a prompt directly against a model.

Supported modes:

- Ollama local execution
- BYOK provider execution
- cloud-credit execution where configured

```bash
# Ollama
lf run exec --ollama --model llama3.2 --prompt "Explain GRASP patterns"

# BYOK
lf run exec --byok openai --model gpt-4o --prompt "Write a haiku"

# Cloud credits
lf auth login
lf run exec --model claude-sonnet-4-6 --prompt "Generate a product description"
```

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--prompt` | Yes | - | Prompt text |
| `--model` | Yes | - | Model key |
| `--ollama` | No | `false` | Use the local Ollama instance |
| `--base-url` | No | `http://localhost:11434` | Ollama base URL |
| `--byok` | No | - | BYOK provider: `openai`, `anthropic`, `google`, `mistral` |
| `--key` | No | - | API key for BYOK |
| `--system` | No | - | Optional system message |
| `--stream` | No | `true` | Stream the response |

---

## Workflow execution status

For Community Edition, workflow execution is primarily a web-app feature.

Current expectations:

- create and run workflows from the app first
- use `lf run exec` for direct model experimentation from the terminal
- treat cloud BYOK workflow execution as platform-executor dependent, not as a self-host guarantee in this repo

---

## Preview scaffolds - not launch-ready

The following commands exist as scaffolds or manual-fallback helpers only:

- `lf run submit`
- `lf run vote`
- `lf run full`
- `lf run replay`

They should be treated as experimental until the automation contract is fully implemented and validated.

### `run submit`

Preview scaffold for a future submission step.

### `run vote`

Preview scaffold for a future voting step.

### `run full`

Preview scaffold for a future end-to-end automation flow.

### `run replay`

Preview scaffold for a future replay/comparison flow.

---

## Related

- [Execution Modes](execution-modes.md)
- [Agent Commands](agent.md)
- [Quickstart](/tutorials/getting-started/quickstart)

<!-- AUTO-GEN-START -->

# `lf run`

Orchestrate battle execution and prompt execution.

## `lf run policy-check`

Evaluate pre-run policy for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--workflow-id` | string | no | Optional workflow UUID |
| `--dry-run` | boolean | no | Skip RPC, just show current settings |

<!-- AUTO-GEN-END -->
