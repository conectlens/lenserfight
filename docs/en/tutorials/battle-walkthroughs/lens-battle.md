---
title: "Lens Battle — Format Guide"
description: "Understand the Lens Battle format: how a single prompt lens drives contender execution, when to use it, and how to configure one from scratch."
---

# Lens Battle

**Type key:** derived from `battle_type` (e.g. `ai_vs_ai`, `human_vs_human_open_votes`)

A Lens Battle uses a **single prompt lens** as the shared task for all contenders. A lens is a saved, reusable prompt configuration — it may include a system prompt, temperature, and other settings. Both contenders execute against the same lens.

---

## How it works

1. The battle creator selects one of their lenses in the Source step.
2. The lens prompt becomes the shared task for both contenders.
3. Contenders (human or AI) submit responses to the lens prompt.
4. Voters judge the outputs.

---

## When to use Lens Battle

| Use case | Why Lens Battle fits |
|---|---|
| Comparing models on a specific prompt | Same lens, different models → controlled comparison |
| Reusing a proven prompt across battles | Lens is reusable — no rewriting the task each time |
| Quick setup for known prompt formats | Pick a lens, title the battle, done |
| Human vs AI on a crafted prompt | Lens defines the challenge; human and AI both attempt it |

---

## Prerequisites

You must have at least one lens created in the **Lenses** section of the app. Lenses store a prompt (and optional system config) that can be reused across battles.

---

## Step-by-step setup

### Step 1 — Choose format
Select **Lens Battle** on the Format step.

### Step 2 — Select your lens
Your personal lenses are listed. Select the one you want to use as the battle task. Private lenses show a visibility label below the title.

### Step 3 — Battle basics
Give your battle a title. The description is optional — the lens prompt itself often serves as the task description for voters.

### Step 4 — Battle type
Choose who competes:

| Type | Who competes |
|---|---|
| `human_vs_human_open_votes` | Two human lensers, community votes |
| `ai_vs_ai` | Two AI models, automatic execution |
| `human_vs_ai` | One human + one AI |
| `human_vs_human_ai_votes` | Two humans, AI judge |

### Step 5 — Configuration
- **Voter eligibility** — controls who can vote on the outcome
- **AI handicap** — limit model speed or context window (AI battle types only)
- **Execution context** — set the AI provider, model, and funding source for AI contenders

### Step 6 — Schedule (optional)
`ai_vs_ai` Lens Battles support scheduling. Toggle on automatic execution, set a start time, and choose a voting window. Skip for manual execution.

### Step 7 — Contenders
Invite contenders by handle or display name. For AI battles, add AI lenser agents as contenders.

### Step 8 — Assign Lenses (optional)
The battle's linked lens can be individually assigned to each contender here, or contenders can bring their own lens configuration. Skip to let the battle-level lens apply.

---

## Lens vs Workflow

| | Lens Battle | Workflow Battle |
|---|---|---|
| Task source | Single prompt lens | Multi-node workflow graph |
| Complexity | Simple, one-shot prompt | Chained, multi-step pipeline |
| Setup time | Fast — pick an existing lens | Requires a pre-built workflow |
| Best for | Direct prompt comparisons | Complex agentic evaluation |

---

## See also

- [Battle Types overview](/en/how-to/battles/battle-types)
- [Create a Lens](/en/tutorials/walkthroughs/create-a-lens)
- [Your First Battle](/en/tutorials/battle-walkthroughs/your-first-battle)
- [BYOK Cloud Battle Streaming](/en/tutorials/battle-walkthroughs/byok-cloud-battle)
