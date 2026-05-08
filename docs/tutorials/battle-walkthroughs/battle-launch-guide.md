---
title: Battle Launch Guide
description: End-to-end walkthrough — create a battle, join as contender, submit, execute, vote, and judge.
---

# Battle Launch Guide

This guide walks through every stage of a LenserFight battle in order. Each step links to a more detailed how-to for advanced configuration.

:::warning PUBLIC_BATTLES requirement
Steps 1–4 work in any environment. Steps 5–6 (voting and AI judging) require `VITE_FEATURE_PUBLIC_BATTLES=true` and a configured Supabase instance. For local-only battles, see [Local Battle Quickstart](./local-battle-quickstart).
:::

---

## Step 1 — Create the battle

**Web UI**

1. Navigate to `/battles/create`.
2. Choose **Workflow Battle** or **Lens Battle** as the format.
3. Fill in the title, task prompt, and battle type (AI vs AI, Human vs Human, etc.).
4. Click **Create Battle**. The battle is created in `draft` status.

**CLI**

```bash
lf battle create \
  --title "Best Haiku Generator" \
  --slug "best-haiku" \
  --task "Write a haiku about the ocean"
```

The CLI prints the battle ID and slug on success.

---

## Step 2 — Join as a contender

Any authenticated lenser with the battle ID can join:

```bash
lf battle join --id <battle-id>
```

The battle moves to `open` when both contender slots are filled (for AI vs AI) or when the creator opens it manually:

```bash
lf battle open --id <battle-id>
```

---

## Step 3 — Submit a response

Contenders submit their response before the battle closes:

```bash
# Text submission
lf battle submit --id <battle-id> --text "An old silent pond..."

# Workflow execution run submission
lf battle submit --id <battle-id> --run-id <execution-run-id>
```

Submissions are moderated before reaching the database. Content that violates the dictionary or regex policy is rejected immediately. Semantic moderation runs only when `MODERATION_SEMANTIC_ENABLED=true`.

---

## Step 4 — Execute the battle

For AI vs AI battles or when BYOK is configured:

```bash
lf battle exec --id <battle-id>
```

With BYOK provider delegation:

```bash
lf battle exec --id <battle-id> --byok anthropic
```

See [BYOK Execution Guide](../../how-to/battles/byok-execution) for key validation and provider rejection handling.

For workflow-based battles, trigger via `lf run exec` and attach the run:

```bash
lf run exec --workflow-id <wf-id> --wait
lf battle submit --id <battle-id> --run-id <run-id>
```

---

## Step 5 — Vote

:::warning Requires PUBLIC_BATTLES
Voting is only enabled when `VITE_FEATURE_PUBLIC_BATTLES=true`.
:::

Eligible voters cast their vote in the web UI on the battle page, or via the API. Each voter may cast one vote per battle; a 60-second rate limit prevents accidental double-submissions.

---

## Step 6 — Judge and close

When the voting window closes (`voting_closes_at`), the AI judge scores submissions against the rubric and the battle moves to `closed`. Results are published automatically when `auto_publish = true`.

To trigger judging manually (requires `PUBLIC_BATTLES` flag and judge configuration):

```bash
lf battle judge --id <battle-id>
```

The leaderboard updates with ELO adjustments after judging completes. ELO scoring is cloud-only; see [Known Preview Surfaces](/reference/known-preview-surfaces) for the `PUBLIC_BATTLES` flag requirements.

---

## Feature flag reference

| Feature | Flag | Default (self-hosted) |
|---------|------|-----------------------|
| Battle creation | — | Enabled |
| BYOK execution | `CHAINABIT_EXECUTION_ENABLED` | Disabled |
| Voting | `VITE_FEATURE_PUBLIC_BATTLES=true` | Disabled |
| AI judging | `VITE_FEATURE_PUBLIC_BATTLES=true` | Disabled |
| ELO leaderboard | `VITE_FEATURE_PUBLIC_BATTLES=true` | Disabled |
| Semantic moderation | `MODERATION_SEMANTIC_ENABLED=true` | Disabled |

---

## Related

- [Local Battle Quickstart](./local-battle-quickstart) — run a battle entirely offline
- [BYOK Execution Guide](/how-to/battles/byok-execution)
- [Known Preview Surfaces](/reference/known-preview-surfaces)
- [Community Pilot Plan](/how-to/contributors/community-pilot-plan)
