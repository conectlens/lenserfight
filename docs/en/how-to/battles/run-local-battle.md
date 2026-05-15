---
title: "How to Run a Local Battle"
description: "Complete reference for all lf battle local subcommands — create, configure, run, vote, and publish offline battles."
---

# How to Run a Local Battle

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


Local battles execute entirely on your machine. No cloud account, no auth, no credits required. New state is persisted in user runtime storage outside the project. Legacy `.lenserfight/local-battles/<id>.json` files are still read for compatibility.

---

## Overview

```
lf battle local <subcommand> [options]
```

| Subcommand | Description |
|---|---|
| `init` | Create a new local battle |
| `add-contender` | Add or replace a contender slot (A or B) |
| `run` | Execute both contenders with BYOK keys |
| `vote` | Record a vote on an executed battle |
| `status` | Show state, contenders, and vote tally |
| `list` | List all local battles |
| `push` | Publish a local battle to LenserFight Cloud |

State files live in the CLI user runtime directory under `local-battles/<uuid>.json`. Do not commit legacy project-root local battle JSON files.

---

## `lf battle local init`

Create a new local battle in `draft` state.

```
lf battle local init --name <name> --task <prompt> [--json]
```

| Flag | Required | Description |
|---|:---:|---|
| `--name` | yes | Human-readable battle name |
| `--task` | yes | Task prompt both contenders will answer |
| `--json` | no | Output full state as JSON |

**Example:**
```bash
lf battle local init \
  --name "CSV Parser Duel" \
  --task "Write a Python function parse_csv(path) -> list[dict]"
```

---

## `lf battle local add-contender`

Add or replace contender slot A or B. The battle transitions to `ready` once both slots are filled.

```
lf battle local add-contender <A|B> --provider <p> --model <m> [options]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<A\|B>` | yes | — | Slot to assign |
| `--provider` | yes | — | `anthropic` \| `openai` \| `google` \| `mistral` \| `ollama` |
| `--model` | yes | — | Model key, e.g. `claude-sonnet-4-6` |
| `--label` | no | model name | Display label shown in output |
| `--key-var` | no | — | Custom env var name for API key (overrides default) |
| `--id` | no | most recent | Battle UUID or prefix |
| `--json` | no | false | Output updated state as JSON |

**Examples:**
```bash
# Anthropic (reads ANTHROPIC_API_KEY automatically)
lf battle local add-contender A --provider anthropic --model claude-sonnet-4-6

# OpenAI with explicit env var name
lf battle local add-contender B --provider openai --model gpt-4o --key-var MY_OPENAI_KEY

# Ollama — no key needed
lf battle local add-contender B --provider ollama --model llama3
```

---

## `lf battle local run`

Execute both contenders simultaneously. Streams tokens to the terminal color-coded by slot.

```
lf battle local run [<id>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | no | most recent | Battle UUID or prefix |
| `--json` | no | false | Output execution result as JSON |

Terminal output uses ANSI color codes:
- `[A]` prefix in **blue**
- `[B]` prefix in **green**

Both contenders run in parallel via `Promise.all()`. Results are saved to the state file on completion.

---

## `lf battle local vote`

Record a vote on an executed battle. Multiple votes are allowed (each is appended).

```
lf battle local vote --slot <A|B|draw> [options]
```

| Flag | Required | Default | Description |
|---|:---:|---|---|
| `--slot` | yes | — | `A` \| `B` \| `draw` |
| `--id` | no | most recent | Battle UUID or prefix |
| `--rationale` | no | — | Optional explanation for your vote |
| `--json` | no | false | Output updated state as JSON |

**Example:**
```bash
lf battle local vote --slot A --rationale "More concise and idiomatic"
```

---

## `lf battle local status`

Show the current state, contenders, and vote tally.

```
lf battle local status [<id>] [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | no | most recent | Battle UUID or prefix |
| `--json` | no | false | Output raw state as JSON |

The winner is computed as the slot with the highest vote count. Ties are shown as "Tied".

---

## `lf battle local list`

List all local battles, sorted by creation date (newest first).

```
lf battle local list [--json]
```

---

## `lf battle local push`

Create a draft cloud battle from a local battle's name and task. Requires `lf auth login`.

```
lf battle local push [<id>] --slug <slug> [--json]
```

| Arg / Flag | Required | Default | Description |
|---|:---:|---|---|
| `<id>` | no | most recent | Battle UUID or prefix |
| `--slug` | yes | — | URL-safe cloud slug (must be unique on LenserFight) |
| `--json` | no | false | Output cloud battle record as JSON |

**What is pushed:** battle title and task prompt.  
**What stays local:** contender configs, outputs, and votes.

After pushing, continue with `lf battle open <cloud-id>` to accept entries.

---

## Key resolution order

When a contender runs, keys are resolved in this priority order:

1. `--key-var` — env var name set on the contender (e.g. `MY_ANTHROPIC_KEY`)
2. Default provider env var — standard name per provider (see table below)
3. Error — if no key found and provider is not Ollama

---

## Supported providers

| Provider | Default env var | Notes |
|---|---|---|
| `anthropic` | `ANTHROPIC_API_KEY` | |
| `openai` | `OPENAI_API_KEY` | |
| `google` | `GOOGLE_AI_API_KEY` | |
| `mistral` | `MISTRAL_API_KEY` | |
| `ollama` | none | Runs locally, no key needed |

---

## Resuming after power-off

State files persist across restarts. Find your battle IDs with:

```bash
lf battle local list
```

Then continue from any step:

```bash
lf battle local run <id>       # re-run (overwrites outputs)
lf battle local vote --id <id> --slot A
lf battle local status <id>
```

---

## See also

- [Run your first local battle](/en/tutorials/battle-walkthroughs/local-battle-quickstart) — step-by-step tutorial
- [Local vs cloud battles](/en/explanation/battles/local-vs-cloud-battles) — when to use each mode
- [BYOK execution](/en/how-to/battles/byok-execution) — run cloud battles with your own keys
