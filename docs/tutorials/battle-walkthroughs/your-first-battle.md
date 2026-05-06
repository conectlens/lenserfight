---
title: "Your First Battle — End-to-End Tutorial"
description: "Walk through creating a battle, inviting contenders, submitting entries, voting, finalizing, and publishing results."
---

# Your First Battle

By the end of this tutorial you will have created a battle, invited a participant, both sides will have submitted entries, you will have voted, and you will have published a final leaderboard.

**Time:** ~15 minutes  
**Prerequisites:** `lf` CLI installed, `lf auth login` completed.

---

## Step 1: Create a draft battle

A battle starts as a `draft`. You design the task and settings before anyone can join.

```bash
lf battle create \
  --title "Python CSV Parser Showdown" \
  --slug "csv-parser-showdown-2026" \
  --task "Write a Python function parse_csv(path: str) -> list[dict] that reads a CSV file and returns rows as dicts. Handle empty files and malformed rows gracefully."
```

Expected output:
```
✔ Battle created.
ID:     a1b2c3d4-...
Title:  Python CSV Parser Showdown
Status: draft
```

Note your battle ID. All subsequent commands use it.

---

## Step 2: Open the battle for entries

Transition from `draft` to `open` so contenders can join.

```bash
lf battle open a1b2c3d4-...
```

Expected output:
```
✔ Battle a1b2c3d4-... opened.
```

---

## Step 3: Invite a participant

You can invite someone by email. They receive a link to join.

```bash
lf battle invite a1b2c3d4-... --email alice@example.com
```

Anyone can also discover and join public battles by searching the feed:
```bash
lf battle feed --status open
```

---

## Step 4: Join as a contender yourself

You are the battle creator, but you can also be a contender.

```bash
lf battle join a1b2c3d4-...
```

Expected output:
```
✔ Joined battle as contender.
Contender ID: 55f1...
Slot:         A
```

---

## Step 5: Submit your entry

Write your solution and submit it as inline text:

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

Your invited participant (Alice) submits via the web UI or with her own `lf battle submit` command after joining.

---

## Step 6: Start voting

Once both contenders have submitted, open the voting phase. Set a deadline:

```bash
lf battle start-voting a1b2c3d4-... --closes-at 2026-05-20T18:00:00Z
```

Expected output:
```
✔ Voting started for battle a1b2c3d4-....
Voting closes at: 2026-05-20T18:00:00Z
```

---

## Step 7: Inspect submissions before voting

```bash
lf battle view a1b2c3d4-...
```

This shows both contenders, their submission text, and current vote totals. Note the contender UUIDs for the next step.

---

## Step 8: Cast your vote

Vote for contender A (the slot, not a specific person):

```bash
lf battle vote a1b2c3d4-... \
  --contender 55f1... \
  --value contender_a \
  --rationale "Handles edge cases with a clean try/except — production-ready"
```

Expected output:
```
✔ Vote submitted for battle a1b2c3d4-....
```

You can only vote once per battle.

---

## Step 9: Close voting and finalize

When voting closes (or you want to close it early):

```bash
lf battle close-voting a1b2c3d4-...
# Battle transitions: voting → scoring

lf battle finalize a1b2c3d4-...
# Battle transitions: scoring → closed
# Winner is determined by highest vote count.
```

---

## Step 10: Publish the results

```bash
lf battle publish a1b2c3d4-...
```

The battle is now `published` and visible on the public feed.

---

## Step 11: View the leaderboard

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

## What to try next

- **Explore the feed** — `lf battle feed --status published` to see what others have built
- **Clone your battle** — `lf battle clone a1b2c3d4-... --title "Round 2" --slug "csv-parser-round-2"`
- **Add a rubric** — Create an evaluation rubric and pass `--rubric-id` during `create` for automated scoring
- **Run a workflow battle** — Use `--task` to define a workflow challenge and connect execution runs as submissions
- **Archive it** — `lf battle archive a1b2c3d4-...` to hide from the feed when the battle is no longer relevant
- **Try local battles** — Run two AI models offline with no cloud setup: `lf battle local init` ([quickstart](/tutorials/battle-walkthroughs/local-battle-quickstart))
- **Use your own API keys** — Execute a cloud battle without spending LenserFight credits: `lf battle exec <id> --byok` ([BYOK tutorial](/tutorials/battle-walkthroughs/byok-cloud-battle))
- **Stream to the web arena** — Watch tokens arrive token-by-token in the browser: `lf battle exec <id> --byok --stream-to-web`

---

## See also

- [How to create and manage a battle](/how-to/battles/create-a-battle)
- [How to join and submit](/how-to/battles/join-and-submit)
- [How to vote and judge](/how-to/battles/vote-and-judge)
- [Run your first local battle](/tutorials/battle-walkthroughs/local-battle-quickstart)
- [Stream a cloud battle with BYOK](/tutorials/battle-walkthroughs/byok-cloud-battle)
- [lf battle CLI reference](/reference/cli/battle)
- [Battle concepts & lifecycle](/reference/battles/index)
