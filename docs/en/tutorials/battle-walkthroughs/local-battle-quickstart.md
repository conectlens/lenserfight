---
title: "Local Battles — Concept & Quickstart"
description: "Understand what a local battle is, how offline AI comparison works, and run your first local battle in 5 minutes using your own API keys."
---

# Local Battles — Concept & Quickstart

> New to battles entirely? Read [Your First Battle](/en/tutorials/battle-walkthroughs/your-first-battle) first — it explains what a battle is and why it exists.

**Time:** ~5 minutes  
**Level:** Beginner  
**Prerequisites:** `lf` CLI installed, plus one of:
- `ANTHROPIC_API_KEY` set in your shell, **or**
- `OPENAI_API_KEY` set, **or**
- [Ollama](https://ollama.com) running locally with a pulled model (fully offline)

---

## What is a Local Battle?

A **local battle** is a self-contained AI competition that runs entirely on your machine. There is no platform account required, no cloud calls to LenserFight, and no credits consumed.

You pick two AI models (or two instances of the same model), give them the same task, and the CLI runs both in parallel, captures their outputs, and — by default — immediately asks an AI judge to pick the winner.

The entire state lives in a single JSON file under your user runtime directory (`~/.lenserfight/local-battles/<id>.json`). You can run it, inspect it, override the verdict, and optionally push the result to the cloud later.

---

## Why use Local Battles instead of cloud battles?

Local battles solve a different problem than cloud battles. Use local when you want:

| Goal | Why local works |
|---|---|
| Compare two models fast | No setup, no auth, runs in under a minute |
| Stay private | Outputs never leave your machine unless you push |
| No internet | Ollama works fully offline; no API key needed |
| Benchmark in CI | Run `lf battle local run` in a GitHub Actions job automatically |
| Zero-friction verdict | The AI judge fires automatically after execution — no manual voting step |
| Explore providers | Try Ollama, Mistral, OpenAI, Anthropic side by side without creating cloud resources |

Use [cloud battles](/en/tutorials/battle-walkthroughs/your-first-battle) when you want community visibility, ELO rankings, web arena streaming, or a persistent audit trail.

---

## How does a local battle work?

A local battle has its own simplified state machine:

```
draft → ready → executed → voted
```

| State | Meaning |
|---|---|
| `draft` | Battle created, no contenders assigned yet |
| `ready` | Both Slot A and Slot B have been configured with a model |
| `executed` | Both models have been called; outputs are saved |
| `voted` | A winner has been recorded (AI judge or human override) |

When you run `lf battle local run`, the CLI:

1. Reads both contender configs from the local JSON file
2. Calls each model's API in parallel (or sequentially for Ollama)
3. Streams the outputs to your terminal, color-coded by slot
4. Saves both full outputs to the JSON file
5. Automatically calls the AI judge (unless `--no-judge` is set)
6. Records the verdict and rationale

The AI judge is invoked the same way as contenders — it calls the configured model with the task, both outputs, and an internal evaluation prompt. The judge's verdict is marked `source=ai`. If you disagree, your manual vote is marked `source=human` and takes precedence.

---

## Architecture of a local battle

```
lf battle local run
      │
      ├── Slot A: provider API call (your key) → tokens stream to terminal
      ├── Slot B: provider API call (your key) → tokens stream to terminal
      │
      ▼
  local-battles/<id>.json
      ├── contender_a: { provider, model, output, tokens }
      ├── contender_b: { provider, model, output, tokens }
      └── verdict:    { winner, rationale, source }
            │
            ▼ (optional)
  lf battle local push --slug "..."
            │
            ▼
  LenserFight Cloud — battle created in draft status
  (outputs stay local; only battle metadata is pushed)
```

---

## Step 1 — Create a local battle

```bash
lf battle local init \
  --name "Haiku Duel" \
  --task "Write a haiku about TypeScript"
```

Expected output:
```
✔ Local battle created.
ID:   a1b2c3d4-...
Name: Haiku Duel

Next steps:
  lf battle local add-contender A --provider anthropic --model claude-haiku-4-5
  lf battle local add-contender B --provider ollama    --model llama3
  lf battle local run a1b2c3d
```

The battle is now `draft`. No network calls have been made.

---

## Step 2 — Add Contender A

Contender A will use Anthropic's Claude Haiku:

```bash
lf battle local add-contender A \
  --provider anthropic \
  --model claude-haiku-4-5
```

The CLI reads `ANTHROPIC_API_KEY` from your environment. To use a different variable name, pass `--key-var MY_CLAUDE_KEY`.

---

## Step 3 — Add Contender B

Using Ollama (no API key, fully offline):

```bash
lf battle local add-contender B \
  --provider ollama \
  --model llama3
```

Or use a second cloud provider:

```bash
lf battle local add-contender B \
  --provider openai \
  --model gpt-4o-mini
```

After both contenders are added, the battle transitions to `ready`.

---

## Step 4 — Run the battle

```bash
lf battle local run
```

Both contenders execute simultaneously. Output is color-coded by slot and streams live:

```
[A] types — strict, verbose,
[B] curly braces hug the world —
[A] yet bugs still appear.
[B] async waits, promises break,
[A] types — strict, verbose,
[B] but types never lie.
```

When both finish, the AI judge evaluates automatically:

```
✔ Execution complete in 4312ms.
Tokens — A: 38  B: 41

AI judge evaluating… (~600 input + ~100 output tokens via ANTHROPIC_API_KEY)
✔ Winner: Contender A
  Rationale: More evocative imagery with correct 5-7-5 structure.
  Judge: anthropic/claude-haiku-4-5 (38 tokens)

Override: lf battle local vote --slot A|B|draw
```

The battle is now in `voted` state. You already have a result — no further steps required.

---

## Step 5 — Override the verdict (optional)

The AI judge runs automatically. If you disagree with its reasoning, override it:

```bash
lf battle local vote \
  --slot B \
  --rationale "Preferred the imagery in B"
```

Human votes override the AI judge and are marked `source=human`. Run `lf battle local status` to see the full breakdown:

```
  Human votes — A: 1  B: 0  Draw: 0
  AI judge    — A: 0  B: 1  Draw: 0
  Winner: A (human vote authoritative)
```

To skip the AI judge entirely and always decide manually:

```bash
lf battle local run --no-judge
```

Multiple teammates can vote with `lf battle local vote --id <id>`.

---

## Step 6 — View the result

```bash
lf battle local status
```

Expected output:
```
  Name:   Haiku Duel
  ID:     a1b2c3d4-...
  Status: voted
  Task:   Write a haiku about TypeScript

  Contender A: anthropic/claude-haiku-4-5
  Contender B: ollama/llama3

  Votes — A: 1  B: 0  Draw: 0
  Winner: A
```

---

## Publish to LenserFight Cloud (optional)

If you want to share results publicly or get community votes:

```bash
lf battle local push --slug "haiku-duel-2026"
```

This creates a cloud battle in `draft` state with your title and task. The contender **outputs are not uploaded** — only the battle shell is created. Use `lf battle open <id>` to continue on the cloud.

---

## What to try next

- **Different models** — Replace `ollama/llama3` with `openai/gpt-4o` or `google/gemini-2.0-flash`
- **List all local battles** — `lf battle local list`
- **PRIVATE_BATTLE.md** — Define participants in a markdown file and execute with `lf battle run PRIVATE_BATTLE.md --execute`
- **Cloud battles with your keys** — `lf battle exec <cloud-id> --byok` to execute a cloud battle with your local API keys ([BYOK tutorial](/en/tutorials/battle-walkthroughs/byok-cloud-battle))
- **Run in CI** — Add `lf battle local run --no-judge` to a GitHub Actions job to auto-benchmark pull requests

---

## See also

- [Local vs. cloud battles (explanation)](/en/explanation/battles/local-vs-cloud-battles) — when to use each mode
- [Your first battle (cloud)](/en/tutorials/battle-walkthroughs/your-first-battle) — the cloud-hosted equivalent
- [How to run a local battle](/en/how-to/battles/run-local-battle) — complete flag reference for every `lf battle local` subcommand
