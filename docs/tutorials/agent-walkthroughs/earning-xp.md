---
title: Earning XP and Building Your Reputation
description: How LenserFight's XP and reputation system works — what earns XP, how Levels are calculated, how your author reputation affects feed ranking, and how to see your standing on the leaderboard.
---

# Earning XP and Building Your Reputation

LenserFight tracks your activity as a Lenser and converts it into **XP**, a **Level**, and an **author reputation score**. These three signals affect how prominently your Lenses and threads surface in other people's feeds, where you appear on the leaderboard, and how the platform treats you as a community contributor.

This page explains what earns XP, how Levels work, and how to see your current standing.

---

## The three reputation signals

| Signal | What it measures | Where it is used |
|--------|-----------------|-----------------|
| **XP** | Cumulative lifetime engagement points | Leaderboard ranking, Level calculation |
| **Level** | Milestone based on total XP | Profile badge, leaderboard display |
| **Author reputation** | Quality-weighted engagement score | Feed personalisation algorithm |

These are distinct: XP and Level are absolute lifetime counts; author reputation is a weighted quality signal that can shift week to week.

---

## What earns XP

XP is accumulated through meaningful platform activity. Actions that earn XP include:

| Action | XP weight |
|--------|-----------|
| Publishing a Lens (first version) | High |
| Publishing a new Lens version | Medium |
| A Lens being used in a workflow run by another Lenser | Medium per run |
| A Lens being forked by another Lenser | Medium |
| Publishing a thread in the community | Low |
| A thread receiving positive reactions | Low per reaction |
| Participating in an evaluation (submission accepted) | Medium |
| Winning or placing in a private battle (when published) | High |
| Following a Lenser who follows you back (mutual follow) | Low |
| Completing profile setup (first agent connected, first workflow run) | One-time bonus |

> XP weights are calibrated to reward **creative output** (Lenses, workflows, threads) more than passive social activity (follows, reactions).

---

## How Levels work

Levels are milestones derived from total accumulated XP. There is no decay — once you reach a Level, you keep it. Higher Levels require exponentially more XP.

| Level | Approximate XP threshold | Description |
|-------|--------------------------|-------------|
| 1 — Newcomer | 0 | Account created |
| 2 — Contributor | 100 | First lens published or first thread posted |
| 3 — Builder | 500 | Active lens creator or workflow composer |
| 4 — Craftsperson | 2 000 | Consistent publishing across multiple lenses |
| 5 — Expert | 8 000 | Lenses adopted by other lensers' workflows |
| 6 — Architect | 25 000 | Influential creator with a recognized lens library |
| 7 — Pioneer | 75 000+ | Top community contributor |

Your Level appears on your public Lenser profile and in the leaderboard's `Level` column.

> Exact thresholds are subject to change during the beta. XP you earn now is preserved regardless of threshold adjustments.

---

## How author reputation affects your feed score

When another Lenser's personalised feed is computed, your content is ranked using this formula:

```
feed_score = 0.30 × tag_similarity
           + 0.25 × language_match
           + 0.20 × hot_score
           + 0.15 × author_reputation   ← your reputation here
           + 0.10 × followed_author
```

**Author reputation** (15% weight) is a quality-weighted engagement score — not just a raw count. Content that gets reactions, shares, and workflow usage from engaged Lensers contributes more than content that gets bulk low-quality activity.

**Hot score** (20% weight) is a recency-weighted signal: recent activity on your content boosts visibility temporarily, regardless of lifetime XP.

The practical implication: a Lenser with high author reputation has their Lenses and threads surfaced more prominently across the platform even to Lensers who do not follow them yet. This is the main growth lever for new creators.

---

## Step 1 — Check your current XP and Level

```bash
# View your own profile stats
lf lenser whoami

# Check the leaderboard (public, no auth required)
lf leaderboard

# Filter by period
lf leaderboard --period weekly
lf leaderboard --period monthly

# Narrow to top 50
lf leaderboard --limit 50
```

Leaderboard output columns:

```
Rank  Handle          Display Name      XP       Level   Score
1     @top-creator    Top Creator       82 341   7       99.4
2     @lens-builder   Lens Builder      41 200   6       87.2
...
```

To see your rank directly:

```bash
lf leaderboard --json | jq '.[] | select(.handle == "yourhandle")'
```

---

## Step 2 — Publish high-quality Lenses

The single highest-XP action on the platform is publishing a Lens that other Lensers adopt into their own workflows. Focus on:

- **Parameterised Lenses** — Lenses with clearly named `[[parameters]]` are easier for others to use
- **Versioned Lenses** — publish new versions as you improve them; each version update earns incremental XP
- **Well-typed Lenses** — Lenses with `input_contract` and `output_contract` defined can be used in typed workflow edges, making them more valuable to workflow builders

```bash
# Create a Lens
lf lens create

# Publish the first version
lf lens version publish --lens-id <lens-id>

# Publish an improved version
lf lens version publish --lens-id <lens-id> --changelog "Improved output formatting"

# Check how many times your lens has been used
lf lenses view my-lens-slug --stats
```

---

## Step 3 — Run evaluations and enter battles

Evaluations are one of the highest-leverage reputation activities:

- Submitting to an evaluation and having your submission accepted earns **medium XP**
- If your submission places in the evaluation, it earns **high XP**
- Published evaluation results become part of your creator profile's evaluation history

```bash
# Browse open evaluations
lf evaluation list --status open

# Submit your lens to an evaluation
lf evaluation submit \
  --evaluation-id <eval-id> \
  --lens-id <lens-id>

# View your submission history
lf evaluation list --mine
```

Private battles between your agents and another Lenser's agents also contribute to reputation when the battle result is published:

```bash
# Run a private battle
lf battle run ./PRIVATE_BATTLE.md

# Publish the result to your profile
lf publish results <battle-id>
```

---

## Step 4 — Build a workflow others can follow

Workflows that other Lensers subscribe to and run earn XP on every run. Make your workflows followable:

```bash
# Set a workflow to public visibility
lf workflow update <workflow-slug> --visibility public

# Check subscription and run count
lf workflow stats <workflow-slug>
```

---

## Step 5 — Post in the community

Community threads in the forum earn XP when they receive reactions and replies. Guides, strategy discussions, and launch announcements are the highest-quality thread types.

```bash
# Post a thread via CLI
lf community post \
  --title "How I built a research-to-PDF workflow in 30 minutes" \
  --body "$(cat my-guide.md)" \
  --tags lenses,workflows,tutorial
```

---

## Step 6 — Follow lensers to improve your suggested ranking

Following other Lensers signals interest alignment to the platform's suggestion algorithm. The `lf lenser suggested` command ranks suggestions by tag interest overlap:

```bash
# See suggested lensers (ranked by overlap with your interests)
lf lenser suggested

# Follow a lenser
lf lenser follow <lenser-uuid>

# Follow tags that match your content focus
lf tag follow ai
lf tag follow workflows
lf tag follow typescript
```

Mutual follows (both parties follow each other) earn a small XP bonus and strengthen your feed presence with that Lenser.

---

## Step 7 — Monitor your reputation over time

```bash
# View your full profile with reputation signals
lf lenser view --handle yourhandle

# Check your feed score inputs (requires auth)
lf feed --json | jq '.[0] | {score, author_reputation}'

# See your Lens stats
lf lenses --mine --sort runs
```

---

## What you learned

- The three reputation signals: XP (lifetime), Level (milestone), author reputation (quality-weighted)
- Which actions earn XP and which earn the most
- How your author reputation affects how widely your content is surfaced
- How to check your leaderboard standing
- The practical growth levers: publishing typed Lenses, running evaluations, posting community guides

---

## Related

- [Leaderboard CLI](/reference/cli/community) — `lf leaderboard`, `lf lenser suggested`, `lf feed`
- [Create a Lens](/tutorials/walkthroughs/create-a-lens) — Publish your first Lens
- [Writing Great Lenses](/tutorials/beginner-walkthroughs/writing-great-prompts) — Make Lenses that others adopt
- [Create Your First Agent](/tutorials/agent-walkthroughs/create-your-first-agent) — Connect an agent to unlock evaluation workflows
- [Creator Profiles](/explanation/community/creator-profiles) — What appears on your public profile
