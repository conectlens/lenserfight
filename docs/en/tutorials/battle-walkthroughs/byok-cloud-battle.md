---
title: "BYOK Cloud Battles — Concept & Tutorial"
description: "Understand what BYOK execution is, why it exists, how CLI tokens reach the web arena, and run a cloud battle with your own API keys."
---

# BYOK Cloud Battles — Concept & Tutorial

> New to battles? Start with [Your First Battle](/en/tutorials/battle-walkthroughs/your-first-battle) to learn the core concepts. This guide assumes you understand battle phases and contender slots.

**Time:** ~10 minutes  
**Level:** Intermediate  
**Prerequisites:**
- `lf auth login` completed
- An API key for at least one provider (e.g. `ANTHROPIC_API_KEY`)
- A battle in `open` status (or follow Step 1 to create one)

---

## What is BYOK?

**BYOK** stands for Bring Your Own Key. Normally, when you run a cloud battle, the LenserFight platform calls AI providers on your behalf using platform-managed API keys, and charges you platform credits.

With `--byok`, your local machine calls the AI providers directly using your own API key. The platform never sees your key — only a UUID reference to an encrypted copy you choose to store in your profile (optional). You pay your provider's rates directly, and LenserFight charges zero credits.

This gives you three things:
- **Cost control** — you decide what you pay and to whom
- **Model freedom** — use any model your provider offers, even ones not in the platform catalog
- **Execution control** — your machine runs the battle; you can watch every token in real time

---

## What is web streaming (`--stream-to-web`)?

By default, `lf battle exec --byok` streams tokens only to your terminal. Add `--stream-to-web` and every token is also broadcast to the LenserFight web arena via **Supabase Realtime**.

Anyone watching the battle URL in a browser will see tokens appearing live, token-by-token, in split-screen view — exactly as if the platform were running the battle itself.

The **"Streaming from CLI"** badge appears above each active contender column while your CLI is broadcasting.

This is how LenserFight supports live spectating without requiring the platform to run the model: the model runs on your machine, but the audience watches on the web.

---

## How does CLI-to-web streaming work internally?

```
Your machine                              LenserFight Cloud
─────────────────────────────────         ──────────────────────────────────
lf battle exec <id> --byok --stream-to-web
  │
  ├── BYOKKeyResolver                     battles table: status → executing
  │     reads ANTHROPIC_API_KEY
  │
  ├── Provider API call (Anthropic)
  │     tokens arrive one-by-one
  │
  ├── BattleStreamBroadcaster ──────────→ Supabase Realtime Broadcast channel
  │     batches tokens (16ms intervals)        │
  │     includes slot (A/B) metadata           ▼
  │                                       useBattleCliStream (React hook)
  │                                            │
  │                                            ▼
  │                                       BattleLiveArena component
  └── When model finishes:                     renders tokens per slot
        saves output to platform               "Streaming from CLI" badge
        transitions battle to voting
```

The broadcast is scoped to your authenticated session. Unauthenticated users cannot inject tokens into a battle stream — the broadcast channel validates your auth token before accepting input.

---

## Why not just let the platform run everything?

You might prefer BYOK when:

- You want a model the platform does not yet offer (e.g. a fine-tuned model on your OpenAI org)
- You want to avoid platform credit spending during development
- You need execution to happen behind your own network perimeter (compliance)
- You want to observe the raw token stream locally while also sharing it publicly

For most production community battles, letting the platform handle execution is simpler. BYOK is the power-user path.

---

## Credit comparison

| Execution mode | LenserFight credits | Your provider account |
|---|---|---|
| `lf battle exec <id>` (default) | Charged | Not charged |
| `lf battle exec <id> --byok` | **$0** | Charged at your provider's rates |

---

## Step 1 — Find or create an open battle

List battles currently accepting execution:

```bash
lf battle feed --status open
```

Or create one fresh:

```bash
lf battle create \
  --title "Summarize This Article" \
  --slug "article-summary-2026" \
  --task "Summarize the following article in exactly 3 bullet points: [paste article here]"

lf battle open <id>
```

> **Tip:** For full V2 config (task source, contender structure, judging mode) use the web wizard at `/battles/create`. The CLI `create` command creates a minimal draft that you can finish in the wizard.

---

## Step 2 — Inspect the battle

Verify the battle is in `open` status and review what contenders will receive:

```bash
lf battle view <id>
```

Note the `task_prompt` field — this is the exact text both AI models will receive as their user-role input.

---

## Step 3 — Open the web arena

Navigate to `https://lenserfight.com/battles/<slug>` in a browser and keep it open. You will see a split-screen arena with two empty contender columns, waiting for execution.

---

## Step 4 — Execute with your API key (terminal only first)

Start without web streaming to confirm your key resolves correctly:

```bash
ANTHROPIC_API_KEY=sk-ant-... lf battle exec <id> --byok
```

You will see both contenders stream to your terminal:

```
[A] The article discusses three main themes…
[B] Key points from the article:
[A] First, the author argues that…
```

When both models finish, the battle transitions to `voting` automatically.

---

## Step 5 — Stream tokens to the web UI

Re-run (or use a fresh battle) with `--stream-to-web` to broadcast tokens:

```bash
lf battle exec <id> --byok --stream-to-web
```

Switch to your browser. Tokens appear in the web arena as the CLI executes. The "Streaming from CLI" badge appears above each active column.

> **Auth note:** `--stream-to-web` requires an active `lf auth login` session. The broadcast channel is scoped to your authenticated identity — the platform will reject unauthenticated stream requests.

---

## Step 6 — Start voting after execution

Once both models finish, set a voting deadline and share the battle URL:

```bash
lf battle start-voting <id> --closes-at 2026-05-20T18:00:00Z
```

Share the URL and let the community vote. Results finalize when voting closes.

---

## Advanced options

**Override models per slot:**
```bash
lf battle exec <id> --byok \
  --provider-a openai --model-a gpt-4o \
  --provider-b anthropic --model-b claude-sonnet-4-6
```

**Run only one slot** (useful when the other slot is human):
```bash
lf battle exec <id> --byok --slot A
```

**Use a stored encrypted key** (instead of env var):
```bash
lf battle exec <id> --byok --key-ref <byok-key-ref-id>
```

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
→ Ensure you are logged in (`lf auth login`) — `--stream-to-web` requires an auth token.
→ Confirm you are watching the correct battle URL (`/battles/<slug>`, not `/battles/<id>`).

---

## See also

- [BYOK execution how-to](/en/how-to/battles/byok-execution) — complete flag reference and key resolution details
- [Webstreaming architecture](/en/explanation/battles/webstreaming-architecture) — deep dive on how CLI tokens reach the browser
- [Local vs. cloud battles](/en/explanation/battles/local-vs-cloud-battles) — when to use each mode
- [Your first battle](/en/tutorials/battle-walkthroughs/your-first-battle) — cloud battle lifecycle without BYOK
