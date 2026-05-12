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

Judged by brevity, syllable count, and technical accuracy. AI judge determines the winner automatically after execution.

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
JSON report: <user-runtime>/workspaces/<id>/runs/ts-haiku-duel.json
Markdown report: <user-runtime>/workspaces/<id>/reports/ts-haiku-duel.md

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

When both finish, the AI judge evaluates automatically:

```
✔ Execution complete in 5891ms.
Results: ts-haiku-duel.result.md
JSON:    ts-haiku-duel.result.json

AI judge evaluating… (~600 input + ~100 output tokens via ANTHROPIC_API_KEY)
✔ Winner: Contender A
  Rationale: Better 5-7-5 syllable structure with stronger technical metaphor.
  Judge: anthropic/claude-haiku-4-5 (42 tokens)

Override: lf battle local vote a1b2c3d --slot A|B|draw
```

> The AI judge verdict is written to `ts-haiku-duel.result.md` under `## Judge Verdict`.

---

## Step 4 — Read the results

```bash
cat ts-haiku-duel.result.md
```

The file contains both outputs under `## Contender A` and `## Contender B` headers, plus a `## Judge Verdict` section with the winner and rationale.

The `.result.json` contains raw output, token counts, timing, and the battle ID.

---

## Step 5 — Override the verdict (optional)

The AI judge verdict stands unless you disagree. To override:

```bash
lf battle local vote --slot B --rationale "Preferred the imagery in B"
```

Human votes are always authoritative — they override the AI judge in `lf battle local status`.

To skip the AI judge entirely:

```bash
lf battle run PRIVATE_BATTLE.md --execute --no-judge
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

- [Run your first local battle](/en/tutorials/battle-walkthroughs/local-battle-quickstart) — no markdown file needed
- [How to run a local battle](/en/how-to/battles/run-local-battle) — full `lf battle local` flag reference
