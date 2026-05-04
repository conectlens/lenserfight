---
title: "Run Your First Local Battle in 5 Minutes"
description: "Create an offline local battle between two AI models using your own API keys. No cloud account, no credits, no auth required."
---

# Run Your First Local Battle in 5 Minutes

By the end of this tutorial you will have two AI models compete on your local machine, streamed live to your terminal, with a vote recorded and a winner declared — entirely offline.

**Time:** ~5 minutes  
**Prerequisites:** `lf` CLI installed, one of the following:
- `ANTHROPIC_API_KEY` environment variable set, **or**
- `OPENAI_API_KEY` environment variable set, **or**
- [Ollama](https://ollama.com) running locally with a pulled model

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

The battle state is saved to `.lenserfight/local-battles/<id>.json`. No network calls are made at this point.

---

## Step 2 — Add Contender A

```bash
lf battle local add-contender A \
  --provider anthropic \
  --model claude-haiku-4-5
```

This uses `ANTHROPIC_API_KEY` from your environment automatically.

To use a different key name, pass `--key-var MY_CLAUDE_KEY`.

---

## Step 3 — Add Contender B

Using Ollama (no API key required):

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

---

## Step 4 — Run the battle

```bash
lf battle local run
```

Both contenders stream simultaneously. Output is color-coded:

```
[A] types — strict, verbose,
[B] curly braces hug the world —
[A] yet bugs still appear.
[B] async waits, promises break,
[A] types — strict, verbose,
[B] but types never lie.
```

When both finish:

```
✔ Execution complete in 4312ms.
Tokens — A: 38  B: 41

Next: lf battle local vote a1b2c3d --slot A|B|draw
```

---

## Step 5 — Vote

```bash
lf battle local vote \
  --slot A \
  --rationale "More evocative imagery"
```

Expected output:
```
✔ Vote recorded: A
Rationale: More evocative imagery
```

You can vote multiple times (each is recorded), or have multiple teammates vote with `lf battle local vote --id <id>`.

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

## Optional — Publish to LenserFight Cloud

If you have a cloud account and want to share results:

```bash
lf battle local push --slug "haiku-duel-2026"
```

This creates a draft cloud battle with your title and task. Outputs are **not** uploaded — only the battle shell. Use `lf battle open <id>` to continue on the cloud.

---

## What to try next

- **Different models** — Replace `ollama/llama3` with `openai/gpt-4o` or `google/gemini-2.0-flash`
- **List all local battles** — `lf battle local list`
- **PRIVATE_BATTLE.md** — Define participants in a markdown file and execute with `lf battle run PRIVATE_BATTLE.md --execute`
- **Cloud battles with your keys** — `lf battle exec <cloud-id> --byok` to execute a cloud battle with your local API keys

---

## See also

- [How to run a local battle](/how-to/battles/run-local-battle) — complete flag reference for every `lf battle local` subcommand
- [Local vs cloud battles](/explanation/battles/local-vs-cloud-battles) — when to use each mode
- [Your first battle (cloud)](/tutorials/battle-walkthroughs/your-first-battle) — the cloud-hosted equivalent of this tutorial
