---
title: "Execute a PRIVATE_BATTLE.md"
description: "Define a local battle in a markdown file, validate it, then execute both AI contenders with your own API keys and save results."
---

# Execute a PRIVATE_BATTLE.md

`PRIVATE_BATTLE.md` is a file-first way to define a battle spec alongside your code — commit it to your repo and reproduce the same AI competition anywhere.

**Time:** ~10 minutes  
**Prerequisites:** `lf` CLI installed, provider API keys set (e.g. `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)

---

## Step 1 — Create a PRIVATE_BATTLE.md

Create the file in your project directory:

```yaml
---
kind: private_battle
name: "TypeScript Haiku Duel"
slug: ts-haiku-duel
id: ts-haiku-duel-001
participants:
  - type: model
    ref: claude
    provider: anthropic
    model: claude-sonnet-4-6
  - type: model
    ref: gpt4o
    provider: openai
    model: gpt-4o
    key_var: OPENAI_API_KEY
---

## Purpose

Compare how two frontier models write creative TypeScript-themed haiku.

## Participants

| Slot | Model | Provider |
|---|---|---|
| A | claude-sonnet-4-6 | Anthropic |
| B | gpt-4o | OpenAI |

## Evaluation

Judged by brevity, syllable count, and technical accuracy. Human vote wins.

## Report

Results saved to `ts-haiku-duel.result.md` after execution.
```

> **Required sections:** `Purpose`, `Participants`, `Evaluation`, `Report` — the validator enforces these.

---

## Step 2 — Validate (no AI called)

```bash
lf battle run PRIVATE_BATTLE.md
```

Expected output:
```
✔ Simulated private battle TypeScript Haiku Duel
Participants: 2
JSON report: .lenserfight/reports/ts-haiku-duel.json
Markdown report: .lenserfight/reports/ts-haiku-duel.md

Tip: participants have provider/model set — run with --execute to actually call AI:
  lf battle run PRIVATE_BATTLE.md --execute
```

No API calls. Use this to check syntax and required sections before burning tokens.

---

## Step 3 — Execute

```bash
lf battle run PRIVATE_BATTLE.md --execute
```

Both contenders stream simultaneously to your terminal:

```
[A] Types guard each boundary —
[B] Semicolons fade at last;
[A] async waits in silence.
[B] generics hold the world tight.
```

When both finish:

```
✔ Execution complete in 5891ms.
Results: ts-haiku-duel.result.md
JSON:    ts-haiku-duel.result.json

Vote: lf battle local vote --slot A|B|draw --id a1b2c3d
```

---

## Step 4 — Read the results

```bash
cat ts-haiku-duel.result.md
```

The file contains both outputs under `## Contender A` and `## Contender B` headers.

The `.result.json` contains raw output, token counts, timing, and the battle ID.

---

## Step 5 — Vote

```bash
lf battle local vote --slot A --rationale "Better 5-7-5 structure"
```

Or mark a draw:

```bash
lf battle local vote --slot draw
```

---

## Step 6 — Optionally push to cloud

To share results publicly:

```bash
lf battle local push --slug "ts-haiku-duel-cloud"
```

This creates a cloud draft with the same title and task. Outputs are not auto-uploaded; use the web UI to add them as contender submissions.

---

## Using `key_var` for per-participant key override

If you store different API keys under non-standard env var names, set `key_var` in the participant:

```yaml
participants:
  - type: model
    ref: my-claude
    provider: anthropic
    model: claude-sonnet-4-6
    key_var: MY_PROJECT_ANTHROPIC_KEY   # reads this var instead of ANTHROPIC_API_KEY
```

---

## What to try next

- **More than 2 contenders** — Only the first two participants with `provider`+`model` run; add more for rotation testing
- **Ollama** — Set `provider: ollama`, `model: llama3.2`, no `key_var` needed
- **Cloud battle from same spec** — `lf battle local push --slug <slug>` after running

---

## See also

- [Run your first local battle](/tutorials/battle-walkthroughs/local-battle-quickstart) — no markdown file needed
- [How to run a local battle](/how-to/battles/run-local-battle) — full `lf battle local` flag reference
