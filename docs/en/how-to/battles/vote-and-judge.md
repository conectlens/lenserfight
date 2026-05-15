---
title: "Vote in a Battle and View Results"
description: "Find battles in voting phase, inspect submissions, cast your vote, and read the leaderboard."
---

# Vote in a Battle and View Results

<ExperimentalBadge title="Battles" description="Battles is still being built end-to-end. Matchmaking, voting and result flows may shift — please try them and report what feels off." />


After this guide you will have cast a vote on a live battle and viewed the leaderboard.

## Before you start

- Run `lf auth login` and confirm you are authenticated
- Check the battle's `voter_eligibility` setting — you must meet the eligibility criteria to vote

---

## 1. Find battles in voting phase

```bash
lf battle feed --status voting
```

---

## 2. View battle details and submissions

```bash
lf battle view <battle-id>
```

This shows the task prompt, contenders (slot A and slot B), their submission content, and current vote counts.

---

## 3. Cast your vote

Vote for a specific contender:
```bash
lf battle vote <battle-id> \
  --contender <contender-id> \
  --value contender_a
```

Vote for the contender in slot B with a rationale:
```bash
lf battle vote <battle-id> \
  --contender <contender-b-id> \
  --value contender_b \
  --rationale "More concise and handles edge cases better"
```

Vote for a draw:
```bash
lf battle vote <battle-id> \
  --contender <contender-a-id> \
  --value draw \
  --draw
```

> **Note:** You can only vote once per battle. Your contender UUID appears in the `lf battle view` output.

---

## 4. View the leaderboard

```bash
lf battle leaderboard <battle-id>
```

Shows each contender's rank, vote count, weighted score, and draw count.

---

## 5. Read comments and discussion

```bash
lf battle comments <battle-id> --limit 50
```

Paginate to older comments:
```bash
lf battle comments <battle-id> --before-ts 2026-05-10T12:00:00Z
```

---

## See also

- [Create and manage a battle](/en/how-to/battles/create-a-battle)
- [Join and submit](/en/how-to/battles/join-and-submit)
- [lf battle CLI reference](/en/reference/cli/battle)
- [Battle concepts & lifecycle](/en/reference/battles/index)
