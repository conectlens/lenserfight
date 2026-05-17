---
title: lf env
description: Show environment variable status for the LenserFight CLI — which variables are set, which are missing, and BYOK provider key presence.
---

# `lf env`

Show the status of all LenserFight environment variables. Helps diagnose missing configuration before running commands that depend on specific env vars.

```bash
lf env [--json] [--reveal]
```

## Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | boolean | `false` | Output as structured JSON |
| `--reveal` | boolean | `false` | Show full secret values (use with caution in trusted terminals only) |

## What it checks

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Local or cloud Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key for unauthenticated requests |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations |
| `LENSERFIGHT_API_URL` | Override for the cloud API endpoint |
| `LENSERFIGHT_GATEWAY_URL` | Local gateway URL |
| `OPENAI_API_KEY` | OpenAI BYOK key |
| `ANTHROPIC_API_KEY` | Anthropic BYOK key |
| `GOOGLE_AI_API_KEY` | Google AI BYOK key |
| `MISTRAL_API_KEY` | Mistral BYOK key |
| `OLLAMA_BASE_URL` | Ollama local inference server URL |
| `LF_LOCAL` | Force local mode for this session |
| `LF_DEBUG` | Enable verbose debug output |
| `LF_LOCALE` | Override locale for CLI messages (`en`, `tr`, `es`, `fr`, `de`, `zh`) |
| `LF_QUIET` | Suppress all decorative output (Lenser quotes, etc.) |
| `NO_COLOR` | Disable ANSI color output |
| `CI` | Detected CI environment — disables decorative output |

## BYOK provider status

The command also shows whether BYOK (Bring Your Own Key) keys are configured for each AI provider. BYOK keys are set via `lf byok setup` and stored encrypted.

## JSON output

```bash
lf env --json
```

```json
{
  "variables": [
    { "name": "SUPABASE_URL", "status": "set", "value": "http://127.0.0.1:54321", "source": "env" },
    { "name": "OPENAI_API_KEY", "status": "missing", "value": "", "source": "" }
  ],
  "config": {
    "present": true,
    "mode": "local",
    "supabaseUrl": "http://127.0.0.1:54321"
  },
  "byok": {
    "openai": true,
    "anthropic": false,
    "google": false,
    "mistral": false
  }
}
```

## Examples

```bash
# Check environment status
lf env

# JSON for CI assertions
lf env --json | jq '.byok.openai'

# Show full secret values (trusted terminal only)
lf env --reveal
```

## Related commands

- [`lf doctor`](./doctor.md) — Full environment and tool diagnostics
- [`lf byok`](./byok.md) — Manage BYOK API keys
- [`lf examples`](./examples.md) — Common usage examples
