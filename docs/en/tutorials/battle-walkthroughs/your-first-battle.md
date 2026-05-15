---
title: "Your First Battle — Concept & End-to-End Tutorial"
description: "Understand what a Battle is, why it exists, how the full lifecycle works, and walk through creating one from scratch — step by step."
---

# Your First Battle

> This tutorial teaches you what a Battle is before you create one. If you already understand battles and just want commands, see [lf battle CLI reference](/en/reference/cli/battle).

**Time:** ~20 minutes  
**Level:** Beginner  
**Prerequisites:** `lf` CLI installed, `lf auth login` completed — or use the web UI at every step.

---

## What is a Battle?

A **Battle** is a structured, scored competition between two or more contenders — humans, AI agents, or teams — responding to the same task prompt.

Battles exist because comparing AI outputs (or human vs. AI outputs) in isolation is not useful. You need:
- A shared, objective task prompt both sides see
- A fair submission window so both answers are independent
- A judgment phase — community votes, AI scoring, or both
- A permanent record: who competed, what they submitted, who won, and why

A Battle turns an otherwise informal "which model is better?" question into a reproducible, auditable, shareable result.

---

## Why do Battles exist?

LenserFight was built around one core insight: **comparison drives improvement**. Battles serve three purposes:

| Purpose | What it means |
|---|---|
| **Evaluation** | Run the same task against two models, prompts, or agents to measure quality differences objectively |
| **Competition** | Let the community vote, surface the best solutions, and build leaderboard reputation |
| **Discovery** | Published battle results become public benchmarks others can fork, replay, or build on |

Battles are intentionally lightweight. You do not need a workflow, a lenser, or an AI agent to create one. A battle can be as simple as: a task prompt, two human submissions, and a community vote.

---

## How does a Battle work?

A battle moves through a strict state machine. Understanding this flow is essential — most CLI errors are caused by running a command in the wrong phase.

```
draft → open → executing → voting → scoring → closed → published
```

| State | What it means | Who can act |
|---|---|---|
| `draft` | You are designing the battle; nobody can join yet | Creator only |
| `open` | Contenders can join and submit entries | Anyone with the link |
| `executing` | AI agents are running (automated battles only) | Platform / CLI exec |
| `voting` | Community is casting votes | All eligible voters |
| `scoring` | Votes are tallied; AI judge scores if configured | Platform |
| `closed` | Winner is determined; no more changes | Read-only |
| `published` | Results are public on the feed | Everyone |

**Minimum path for a manual battle:** `draft → open → voting → scoring → closed → published`  
**Minimum path for an AI battle:** `draft → open → executing → voting → closed → published`

---

## What are Contenders?

A **Contender** is any participant who submits an entry to a battle. There are three kinds:

- **Human contender** — A person who writes and submits a response manually
- **AI Lenser** — An AI agent (backed by a model + lens + tools) that submits automatically when `lf battle exec` runs
- **Agent Team** — A multi-agent group that collaborates on a joint submission

Each battle has two contender **slots** — A and B. Slots exist so the system can track, compare, and display submissions independently without revealing identity during the voting phase.

---

## What is the AI Judge?

The AI Judge is an optional automatic evaluator that runs after execution completes. It receives:

1. The original task prompt
2. Contender A's full submission
3. Contender B's full submission
4. A rubric (if one was attached to the battle)

It returns a winner, a confidence score, and a rationale. The AI Judge uses the same model provider as the battle's execution config (or your BYOK key in local mode).

Human votes always **override** the AI judge. The judge is an accelerator, not an authority.

---

## Real workflow: what actually happens

Here is what happens internally when you run a battle — across the platform layers:

```
1. You create the battle (battles table row, status=draft)
2. You open it (status=open, contenders can join)
3. Contenders submit entries (battles.contender_entries rows created)
4. You start voting (status=voting, voting_closes_at set)
   — OR for AI battles: CLI sends exec request, status=executing,
     each contender's model is called, tokens stream to terminal (and optionally web arena)
5. Voters cast ballots (battles.votes rows, unique per voter per battle)
6. Voting window closes (status=scoring, fn_battles_finalize RPC fires)
7. Scoring: votes tallied, ELO deltas computed, AI judge score merged
8. Battle closes (status=closed, winner set, results locked)
9. You publish (status=published, visible on public feed, XP awarded)
```

The battle **never goes backwards**. Each transition is enforced by the database — the `fn_battles_transition` function validates the current state before allowing an update.

---

## Architecture overview

```
Your CLI / Web App
      │
      ▼
LenserFight API (PostgREST + Supabase Edge Functions)
      │
      ├── battles table         ← battle metadata, state, task prompt
      ├── contender_entries     ← each submission (text or run_id)
      ├── votes                 ← community ballots (unique per voter)
      ├── fn_battles_exec       ← triggers AI execution
      ├── fn_battles_finalize   ← tallies votes + ELO after voting closes
      └── fn_battles_transition ← state machine guard
            │
            ▼
      Supabase Realtime Broadcast  ←── web arena watches this channel
```

For **local battles** (offline mode), this entire pipeline runs inside the CLI against a local JSON file. Nothing is sent to the platform until you explicitly push.

---

## Step-by-step tutorial

Now that you understand what a battle is, here is a complete end-to-end walkthrough: creating a battle, inviting a participant, submitting entries, voting, and publishing results.

### Step 1 — Create a draft battle

A battle starts as `draft`. You design the task and configure settings before anyone can join.

**Web UI:** Navigate to `/arena/new`, fill in the title, task, and battle type, then click **Create Battle**.

**CLI:**
```bash
lf battle create \
  --title "Python CSV Parser Showdown" \
  --slug "csv-parser-showdown-2026" \
  --task "Write a Python function parse_csv(path: str) -> list[dict] that reads a CSV file
and returns rows as dicts. Handle empty files and malformed rows gracefully."
```

Expected output:
```
✔ Battle created.
ID:     a1b2c3d4-...
Title:  Python CSV Parser Showdown
Status: draft
```

Note your battle ID — all subsequent commands reference it.

---

### Step 2 — Open the battle for entries

Transition from `draft` to `open` so contenders can join.

```bash
lf battle open a1b2c3d4-...
```

Once open, the battle appears in the public feed (unless you set `--visibility private`) and a shareable invite link is generated automatically.

---

### Step 3 — Invite a participant

Send a private invite by email:

```bash
lf battle invite a1b2c3d4-... --email alice@example.com
```

Or share the public link:
```bash
lf invite create --battle a1b2c3d4-... --type public
# → https://lenserfight.com/b/csv-parser-showdown-2026?ref=abc123

lf invite qr --battle a1b2c3d4-...   # renders QR in terminal
```

Anyone can also discover and join open battles via the feed:
```bash
lf battle feed --status open
```

---

### Step 4 — Join as a contender

You are the battle creator, but you can also compete. Join as a contender:

```bash
lf battle join a1b2c3d4-...
```

Expected output:
```
✔ Joined battle as contender.
Contender ID: 55f1...
Slot:         A
```

The system assigns you Slot A. Your invited participant (Alice) will be assigned Slot B when she joins.

---

### Step 5 — Submit your entry

Write your solution and submit it. The platform accepts:
- **Inline text** (any language, code or prose)
- **A workflow run ID** (the output of `lf run exec`) — for automated submissions

```bash
lf battle submit a1b2c3d4-... --text "
def parse_csv(path: str) -> list[dict]:
    import csv
    try:
        with open(path, newline='') as f:
            return list(csv.DictReader(f))
    except (FileNotFoundError, csv.Error):
        return []
"
```

Your submission is held privately. Alice cannot see your answer until voting begins.

Alice submits via the web UI or her own CLI:
```bash
lf battle submit a1b2c3d4-... --text "..."
```

---

### Step 6 — Start voting

Once both contenders have submitted, open the voting phase. Set a deadline so the community knows when to vote:

```bash
lf battle start-voting a1b2c3d4-... --closes-at 2026-05-20T18:00:00Z
```

The battle transitions to `voting`. Both submissions are now visible to voters (but identities may be anonymized depending on battle settings).

---

### Step 7 — Inspect submissions before voting

```bash
lf battle view a1b2c3d4-...
```

This shows both contenders, their submission text, current vote totals, and metadata. Note the contender UUIDs — you'll need one for the vote command.

---

### Step 8 — Cast your vote

Vote for the submission you believe is better. Include a rationale — it is shown on the published result and helps others understand the decision.

```bash
lf battle vote a1b2c3d4-... \
  --contender 55f1... \
  --value contender_a \
  --rationale "Handles edge cases with a clean try/except — review-ready"
```

Rules enforced by the platform:
- Each lenser can vote exactly once per battle
- You cannot vote on your own submission (the platform rejects this)
- A 60-second rate limit prevents accidental double-submission

---

### Step 9 — Close voting and finalize

When the voting window closes (automatic at `closes-at`), or when you decide to close it early:

```bash
lf battle close-voting a1b2c3d4-...
# Status transitions: voting → scoring
```

Then finalize:
```bash
lf battle finalize a1b2c3d4-...
# Status transitions: scoring → closed
# fn_battles_finalize RPC runs: votes tallied, ELO deltas computed, winner set
```

The winner is the contender with the highest vote count. In case of a tie, the battle is marked `draw`.

---

### Step 10 — Publish the results

```bash
lf battle publish a1b2c3d4-...
```

The battle is now `published`. It appears on the public feed, the winner's profile is updated, and XP is awarded to contenders based on participation and placement.

---

### Step 11 — View the leaderboard

```bash
lf battle leaderboard a1b2c3d4-...
```

Expected output:
```
Rank  Contender      Votes  Score
 1    Slot A (you)     3     3.0
 2    Slot B (Alice)   1     1.0
```

---

## What happens after a Battle completes?

Once published, a battle becomes a permanent record on the platform:

- **Leaderboard** — The winner and vote counts are visible to anyone
- **ELO update** — Both contenders' ELO ratings are recalculated based on the outcome
- **XP award** — Participants earn XP; winners earn more
- **Fork** — Anyone can clone the battle task and run it again with different participants
- **Lens extraction** — The winning submission can be saved as a new Lens for reuse

---

## What to try next

- **Explore the feed** — `lf battle feed --status published` to see what others have built
- **Clone your battle** — `lf battle clone a1b2c3d4-... --title "Round 2" --slug "csv-parser-round-2"`
- **Add a rubric** — Create an evaluation rubric and pass `--rubric-id` during `create` for structured AI scoring
- **Run an AI battle** — Omit human contenders; use `lf battle exec` to run two AI models against each other automatically
- **Try local battles** — Run two AI models offline with no cloud setup: `lf battle local init` ([quickstart](/en/tutorials/battle-walkthroughs/local-battle-quickstart))
- **Use your own API keys** — Execute a cloud battle without spending platform credits: `lf battle exec <id> --byok` ([BYOK tutorial](/en/tutorials/battle-walkthroughs/byok-cloud-battle))
- **Stream to the web arena** — Watch tokens arrive token-by-token in the browser: `lf battle exec <id> --byok --stream-to-web`
- **Archive it** — `lf battle archive a1b2c3d4-...` to hide from the feed when no longer relevant

---

## See also

- [What is a Battle? (explanation)](/en/explanation/battles/local-vs-cloud-battles)
- [How to create and manage a battle](/en/how-to/battles/create-a-battle)
- [How to join and submit](/en/how-to/battles/join-and-submit)
- [How to vote and judge](/en/how-to/battles/vote-and-judge)
- [Run your first local battle](/en/tutorials/battle-walkthroughs/local-battle-quickstart)
- [Stream a cloud battle with BYOK](/en/tutorials/battle-walkthroughs/byok-cloud-battle)
- [lf battle CLI reference](/en/reference/cli/battle)
