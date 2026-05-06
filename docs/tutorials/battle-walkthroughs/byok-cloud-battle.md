---
title: "Stream a Cloud Battle with Your Own API Keys"
description: "Run a LenserFight Cloud battle using your own API keys from the CLI, and watch tokens stream into the web UI in real-time."
---

# Stream a Cloud Battle with Your Own API Keys

By the end of this tutorial a cloud battle will execute using your local API key, and you will watch tokens arrive in the LenserFight web arena token-by-token — without spending a single platform credit.

**Time:** ~10 minutes  
**Prerequisites:**
- `lf auth login` completed
- `ANTHROPIC_API_KEY` (or another provider key) set in your shell
- A battle in `open` status (create one with `lf battle create` + `lf battle open`)

---

## Step 1 — Find an open battle

```bash
lf battle feed --status open
```

Note the battle ID and slug from the output. If you need to create one first:

```bash
lf battle create \
  --title "Summarize This Article" \
  --slug "article-summary-2026" \
  --task "Summarize the following article in exactly 3 bullet points: [paste article here]"

lf battle open <id>
```

---

## Step 2 — Inspect the battle

```bash
lf battle view <id>
```

Confirm status is `open`. Note the `task_prompt` — this is what both contenders will receive.

---

## Step 3 — Open the web arena

Navigate to `https://lenserfight.com/battles/<slug>` in a browser tab and keep it open. The arena will show a split-screen with two empty contender slots in executing state.

---

## Step 4 — Execute with your API key (no web streaming yet)

Start with a dry run to verify your key works:

```bash
ANTHROPIC_API_KEY=sk-ant-... lf battle exec <id> --byok
```

You will see both contenders stream to your terminal:

```
[A] The article discusses three main themes…
[B] Key points from the article:
[A] First, the author argues that…
```

The battle transitions to `voting` when both finish. Your API account is charged (not LenserFight credits).

---

## Step 5 — Stream tokens to the web UI

Re-run with `--stream-to-web` to broadcast each token to the arena over Supabase Realtime:

```bash
lf battle exec <id> --byok --stream-to-web
```

Switch to your browser. You will see tokens appear in the arena as the CLI executes — the **"Streaming from CLI"** badge appears above each active contender column.

> **Note:** `--stream-to-web` requires authentication (`lf auth login`) because the broadcast channel is scoped to your session.

---

## Step 6 — Start voting after execution

Once both contenders complete, the battle is in `voting` phase. Set a deadline:

```bash
lf battle start-voting <id> --closes-at 2026-05-20T18:00:00Z
```

Share the battle URL and let the community vote.

---

## Credit billing

| Mode | LenserFight credits | Your provider account |
|---|---|---|
| `lf battle exec <id>` (default) | Charged | Not charged |
| `lf battle exec <id> --byok` | **$0** | Charged by provider |

Use `--byok` when you want to keep full control of spending and model choice.

---

## Troubleshooting

**Key not found:**
```
Error: No API key found for provider 'anthropic'. Set the ANTHROPIC_API_KEY environment variable.
```
→ Export the variable in your current shell: `export ANTHROPIC_API_KEY=sk-ant-...`

**Battle not in open status:**
```
Error: Battle must be in 'open' status to execute.
```
→ Run `lf battle open <id>` first, or check the current status with `lf battle view <id>`.

**Web UI not showing tokens:**
→ Ensure you are logged in (`lf auth login`) — `--stream-to-web` requires an auth token to open the broadcast channel.

---

## What to try next

- **Override models** — `lf battle exec <id> --byok --provider-a openai --model-a gpt-4o --provider-b anthropic --model-b claude-sonnet-4-6`
- **Run one slot only** — `lf battle exec <id> --byok --slot A`
- **Local battles** — no cloud needed: `lf battle local run`

---

## See also

- [BYOK execution how-to](/how-to/battles/byok-execution) — complete flag reference and key resolution details
- [Webstreaming architecture](/explanation/battles/webstreaming-architecture) — how CLI tokens reach the web UI
- [Your first battle](/tutorials/battle-walkthroughs/your-first-battle) — cloud battle lifecycle without BYOK
