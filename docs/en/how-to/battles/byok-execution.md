---
title: "How to Execute Cloud Battles with Your Own API Keys"
description: "Use your own provider API keys to execute cloud battles from the CLI — zero platform credits, full model control, with optional real-time web UI streaming."
---

# How to Execute Cloud Battles with Your Own API Keys

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


`lf battle exec` runs a cloud battle's AI contenders from your local machine using your own provider API keys. Platform credits are never charged in BYOK mode.

---

## Overview

```
lf battle exec <battle-id> [options]
```

| Mode | Credits used | Keys used |
|---|---|---|
| Default (no `--byok`) | LenserFight wallet | Platform keys |
| `--byok` | **$0** | Your env vars |

---

## Prerequisites

- Battle must be in `open` status (`lf battle view <id>` to check)
- Provider API key set as an environment variable
- `lf auth login` completed (required when using `--stream-to-web`)

---

## Supported providers

| Provider | Required env var | Ollama? |
|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | No |
| `openai` | `OPENAI_API_KEY` | No |
| `google` | `GOOGLE_AI_API_KEY` | No |
| `mistral` | `MISTRAL_API_KEY` | No |
| `ollama` | none | Yes — runs at `localhost:11434` |

---

## Basic usage

```bash
lf battle exec <battle-id> --byok
```

Both contenders execute using the battle's stored provider/model config, with your local keys substituted for platform keys. Output streams to the terminal.

---

## Provider and model override flags

Override the provider or model for either slot without changing the cloud battle config:

```
lf battle exec <id> --byok \
  --provider-a anthropic --model-a claude-sonnet-4-6 \
  --provider-b openai    --model-b gpt-4o
```

| Flag | Description |
|---|---|
| `--provider-a` | Provider for slot A (overrides stored config) |
| `--model-a` | Model key for slot A |
| `--provider-b` | Provider for slot B |
| `--model-b` | Model key for slot B |

---

## Single-slot execution

Execute only one contender:

```bash
lf battle exec <id> --byok --slot A
lf battle exec <id> --byok --slot B
```

Useful when one slot already has a submission and you only need to fill the other.

---

## Streaming tokens to the web UI

Add `--stream-to-web` to broadcast every token to the LenserFight arena as the CLI executes:

```bash
lf battle exec <id> --byok --stream-to-web
```

- Open `https://lenserfight.com/battles/<slug>` in a browser tab before running
- The **"Streaming from CLI"** badge appears on each active contender column
- Tokens arrive with sub-100ms latency via Supabase Realtime Broadcast
- The arena falls back to DB-based updates if the broadcast channel disconnects

Requires `lf auth login` — the broadcast channel is authenticated to prevent spoofing.

---

## Credit billing

When `--byok` is set:
- LenserFight deducts **$0** from your wallet
- Your provider account is charged at their standard API rates
- Token usage is logged to the battle's execution record for transparency

Without `--byok`:
- LenserFight charges your wallet at standard credit rates
- You do not need any provider API keys

---

## Key resolution order

For each contender slot, keys are resolved in this order:

1. `--provider-a` / `--provider-b` flag determines the provider
2. The default env var for that provider is checked (see table above)
3. If no key is found and provider is not Ollama — execution stops with an error

---

## Error handling

**Key not found:**
```
Error: No API key found for provider 'anthropic'. Set ANTHROPIC_API_KEY.
```
→ `export ANTHROPIC_API_KEY=sk-ant-...` in your current shell.

**Provider error mid-stream:**  
Partial output is preserved in the submission record. Re-run to overwrite.

**Battle not in open status:**  
Run `lf battle open <id>` first, or check the lifecycle with `lf battle view <id>`.

---

## After execution

When both slots complete, the battle auto-transitions to `voting`. Start the voting window:

```bash
lf battle start-voting <id> --closes-at 2026-06-01T18:00:00Z
```

---

## See also

- [Stream a cloud battle with BYOK (tutorial)](/en/tutorials/battle-walkthroughs/byok-cloud-battle)
- [Webstreaming architecture](/en/explanation/battles/webstreaming-architecture)
- [lf battle CLI reference](/en/reference/cli/battle)
