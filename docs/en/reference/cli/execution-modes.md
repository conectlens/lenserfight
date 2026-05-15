# Lens Execution Modes

`lenserfight run exec` supports three execution modes. All three use the same provider adapters from `@lenserfight/providers` — no code duplication.

## Modes

### Ollama (local inference)

Runs against a local [Ollama](https://ollama.com) instance. No hosted provider API key is required for the LenserFight call path. Review Ollama's own model download, update, logging, and network behavior before using this mode for sensitive workflows.

```bash
# Default base URL: http://localhost:11434
lenserfight run exec --ollama --model llama3.2 --prompt "Explain GRASP patterns"

# Custom base URL (e.g. a remote Ollama on your LAN — replace with your host)
lenserfight run exec --ollama --base-url http://ollama.local:11434 \
  --model mistral --prompt "Summarize: {{text}}"
```

### BYOK (Bring Your Own Key)

Uses your own API key. The key is resolved transiently — it is **never stored in the database, never logged, and never appears in error messages**.

Key resolution order: `--key` flag → environment variable → error.

```bash
# Key via environment variable (recommended)
export OPENAI_API_KEY=sk-...
lenserfight run exec --byok openai --model gpt-4o --prompt "Write a haiku"

# Key via CLI flag (less recommended — visible in shell history)
lenserfight run exec --byok anthropic --key sk-ant-... \
  --model claude-sonnet-4-6 --prompt "Explain BYOK security"

# Google / Gemini
export GOOGLE_API_KEY=...
lenserfight run exec --byok google --model gemini-2.0-flash --prompt "Hello"

# Mistral
export MISTRAL_API_KEY=...
lenserfight run exec --byok mistral --model mistral-large-latest --prompt "Hello"
```

Supported BYOK providers: `openai`, `anthropic`, `google`, `mistral`.

### Cloud (default)

Uses your LenserFight wallet credits. Requires authentication.

```bash
lenserfight auth login

lenserfight run exec --model claude-sonnet-4-6 --prompt "Generate a product description"
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--prompt <text>` | Prompt text | required |
| `--model <key>` | Model key | required |
| `--ollama` | Local Ollama mode | false |
| `--base-url <url>` | Ollama base URL | `http://localhost:11434` |
| `--byok <provider>` | BYOK provider key | — |
| `--key <api-key>` | API key for BYOK | — |
| `--system <text>` | System message | — |
| `--stream` | Stream response | true |

## BYOK Security

- Keys are resolved transiently at invocation time only.
- Keys are **never** written to any database row (only `byok_key_ref_id` UUID is stored for cloud BYOK).
- Keys are **never** printed to console, logs, or error messages.
- The `BYOKKeyResolver` class in `libs/providers/src/lib/byok-key-resolver.ts` owns all key resolution logic.
