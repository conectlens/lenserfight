---
title: Earning XP and Building Your Reputation
description: Complete guide to LenserFight XP — what earns XP, exact amounts, seasons, streaks, badges, levels, anti-abuse rules, and how to check your standing.
---

# Earning XP and Building Your Reputation

LenserFight uses an XP-based reputation system to recognise meaningful platform activity. XP converts into Levels (a permanent milestone), feeds the leaderboard, and determines seasonal rankings and badge awards.

---

## The three reputation signals

| Signal | What it measures | Where it appears |
|--------|-----------------|-----------------|
| **XP** | Cumulative lifetime engagement points | Leaderboard, Level calculation, Season rank |
| **Level** | Milestone derived from total XP (100 levels) | Profile badge, leaderboard |
| **Author reputation** | Quality-weighted engagement score | Feed personalisation algorithm |

XP and Level are permanent — they never decay. Author reputation shifts week to week based on quality signals.

---

## XP rule matrix

### Content creation

| Action | Base XP | Difficulty | Daily cap | Season cap | Notes |
|--------|---------|-----------|-----------|-----------|-------|
| Lens Published | 80 | Hard (1.5×) | 5/day | 2,000 | Public visibility required |
| Thread Posted | 30 | Standard (1×) | 10/day | 1,500 | Public threads only |
| Reply Posted | 15 | Easy (0.75×) | 20/day | 1,200 | |
| Workflow Created | 60 | Hard (1.5×) | 3/day | 1,500 | |
| Workflow Published | 40 | Standard (1×) | 2/day | 800 | First public transition only |
| Prompt Created | 15 | Easy (0.75×) | 5/day | 400 | Draft creation |
| Multilingual Content | 30 | Standard (1×) | 5/day | 600 | Non-English locale tag required |
| Generative Media Published | 25 | Standard (1×) | 5/day | 500 | AI-generated media artifact |

### Social — giving (you take the action)

| Action | Base XP | Daily cap | Notes |
|--------|---------|-----------|-------|
| Reaction Given | 5 | 30/day | 60s cooldown |
| Workflow Liked | 5 | 20/day | 2min cooldown |
| Workflow Saved | 8 | 10/day | 5min cooldown |
| Workflow Forked | 20 | 5/day | 30min cooldown |
| Lens Forked | 20 | 5/day | 30min cooldown |
| Invite Sent | 10 | 3/day | 1hr cooldown |

### Social — receiving (others take the action on your content)

| Action | Base XP | Daily cap | Notes |
|--------|---------|-----------|-------|
| Reaction Received | 8 | 50/day | Self-reactions excluded |
| Reply Received | 10 | 30/day | Self-replies excluded |
| Workflow Like Received | 8 | 30/day | |
| Workflow Save Received | 12 | 20/day | |
| Workflow Fork Received | 25 | 10/day | Quality signal |
| Lens Fork Received | 25 | 10/day | Quality signal |
| Workflow Run Received | 6 | 50/day | Another lenser runs your workflow |
| New Follower | 5 | 20/day | |
| Invite Accepted | 100 | 5/day | Invited user completes profile |

### Battles (Hard/Legendary difficulty multiplier applies)

| Action | Base XP | Difficulty | Daily cap | Season cap | Notes |
|--------|---------|-----------|-----------|-----------|-------|
| Battle Created | 50 | Standard (1×) | 2/day | 800 | Non-draft battles |
| Battle Joined | 20 | Easy (0.75×) | 5/day | 500 | Before submission deadline |
| Battle Participated | 100 | Hard (1.5×) | 5/day | 2,000 | When battle closes |
| Battle Won | 150 | Legendary (2.5×) | 5/day | 2,500 | **375 effective XP** |
| Battle Voted | 10 | Easy (0.75×) | 20/day | 1,000 | 10min cooldown |
| Battle Top 3 Finish | 75 | Hard (1.5×) | 3/day | 1,500 | 4+ contestants required |
| Battle Result Published | 20 | Easy (0.75×) | 3/day | 300 | |
| Battle Submission Evaluated | 30 | Standard (1×) | 5/day | 750 | Judge-accepted submission |
| Fair Evaluation Cast | 15 | Standard (1×) | 10/day | 750 | Vote aligns with consensus |

### Daily activity & streaks

| Action | Base XP | Cooldown | Notes |
|--------|---------|---------|-------|
| Daily Login | 10 | 23 hours | Streak-tracked |
| 7-Day Streak Bonus | 50 | 7 days | Log in 7 consecutive days |
| 14-Day Streak Bonus | 80 | 14 days | |
| 30-Day Streak Bonus | 150 | 30 days | |

### Platform milestones (one-time)

| Action | Base XP | Notes |
|--------|---------|-------|
| Account Created | 25 | Email verified |
| Profile Completed | 100 | All profile fields filled |
| CLI Initialized | 50 | First `lf init` with account |
| Agent Created | 80 | First AI agent configured |

### Learning & challenges

| Action | Base XP | Daily cap | Season cap |
|--------|---------|-----------|-----------|
| Tutorial Completed | 60 | 3/day | 600 |
| Walkthrough Completed | 80 | 2/day | 480 |
| Seasonal Challenge Completed | 200 | 5/day | 2,000 |

### Open-source contributions (verified externally)

| Action | Base XP | Daily cap | Season cap |
|--------|---------|-----------|-----------|
| Core PR Merged | 500 | 2/day | 3,000 |
| Community PR Merged | 200 | 3/day | 2,000 |
| Docs PR Merged | 100 | 5/day | 1,500 |
| Issue Filed | 30 | 5/day | 500 |
| Code Review Given | 40 | 5/day | 600 |

> **Difficulty multipliers:** Easy = 0.75×, Standard = 1×, Hard = 1.5×, Legendary = 2.5×.  
> Effective XP = `base_xp × difficulty_multiplier`. The table above shows base XP; the DB applies the multiplier at award time.

---

## Fairness and anti-abuse rules

- **Self-interaction is blocked.** Self-reactions, self-replies, and self-votes do not award received-type XP.
- **Visibility gate.** Only public/published content earns creation XP. Unpublishing or archiving content triggers a creation XP rollback.
- **Cooldowns.** High-frequency actions (reactions, votes, logins) have per-action cooldowns enforced in the database.
- **Daily and season caps.** Every rule has a `max_events_per_day` and `max_xp_per_season` limit — spamming the same action stops earning XP after the cap is hit.
- **Moderation freeze.** If your content is moderated or removed, the associated XP events are marked frozen. The audit trail is preserved but frozen XP is excluded from totals.
- **Concurrent protection.** `pg_advisory_xact_lock` serialises concurrent XP award calls per lenser — duplicate events cannot race into the database.
- **Immutable events.** Once recorded, XP events cannot be edited. The `prevent_event_mutations` trigger enforces this.

---

## Level progression

Levels use a polynomial curve (increment per level N = `CEIL(150 × N^0.75)`). There are 100 levels. XP never decays.

| Level | Name | Approx. total XP |
|-------|------|-----------------|
| 1 | Newcomer | 0 |
| 5 | — | ~800 |
| 10 | Builder | ~4,400 |
| 25 | Expert | ~22,500 |
| 50 | Architect | ~92,000 |
| 75 | Legend | ~191,000 |
| 100 | Champion | ~330,000 |

**Typical XP ranges per year:**

| User type | XP / year |
|-----------|----------|
| Casual (1–2×/week) | 5,000–15,000 |
| Regular (daily) | 20,000–40,000 |
| Power user (intensive) | 40,000–80,000 |

---

## Seasons

Seasons are 90-day windows. Each season has an independent leaderboard and can feature challenges with bonus XP.

| State | Description |
|-------|-------------|
| **active** | Current season — XP accumulates toward the season leaderboard |
| **upcoming** | Next season — visible but not yet scoring |
| **ended** | Archived — final rankings locked, season badges awarded |

Season leaderboards are separate from the global leaderboard. Seasonal XP does not reset your lifetime total — it is a separate window. Season rewards (badges, titles) are awarded to top finishers at the end of each season.

To browse seasons and season leaderboards: **LenserBoard → Season tab**.

---

## Streaks

Log in daily to build a streak. Streak bonuses are awarded automatically when thresholds are crossed:

| Streak | Bonus XP |
|--------|---------|
| 7 consecutive days | +50 XP |
| 14 consecutive days | +80 XP |
| 30 consecutive days | +150 XP |

Streaks use a 23-hour cooldown (not calendar-day) so you can log in at similar times daily without missing a day due to timezone drift.

---

## Badges

Badges are permanent awards shown on your profile. They are earned automatically when milestones are crossed.

**Level milestones:**

| Badge | Condition | Icon |
|-------|-----------|------|
| Newcomer | Reach Level 5 | 🌱 |
| Builder | Reach Level 10 | 🏗️ |
| Expert | Reach Level 25 | ⚡ |
| Architect | Reach Level 50 | 🏛️ |
| Legend | Reach Level 75 | 🌟 |
| Champion | Reach Level 100 | 🏆 |

**XP milestones:**

| Badge | Condition | Icon |
|-------|-----------|------|
| 1K XP | Earn 1,000 total XP | 💡 |
| 10K XP | Earn 10,000 total XP | 🔥 |
| 50K XP | Earn 50,000 total XP | 💎 |

**Streak milestones:**

| Badge | Condition | Icon |
|-------|-----------|------|
| 7-Day Streak | 7 days in a row | 🔆 |
| 30-Day Streak | 30 days in a row | ☀️ |

**Seasonal:**

- Season Champion badges are awarded to the #1 earner in each ended season.
- Top-10 finishers receive a season-specific badge per season.

---

## The LenserBoard — four views explained

The LenserBoard has four distinct ranking views. They measure different things and should not be confused.

### XP Ranking

Your cumulative lifetime XP, ranked against all other lensers. This is the primary leaderboard.

It has two **scopes** (toggle on the left):

| Scope | What it shows |
|-------|--------------|
| **Global** | All XP you have ever earned since joining — permanent, never resets |
| **Current Season** | Only XP earned during the ongoing 90-day season window — resets each season |

Use Global to see your permanent standing. Use Current Season to see how you are performing in the live competitive period.

It also has **timeframe filters** (toggle on the right) — `All Time`, `This Month`, `This Week` — which narrow the data window within the selected scope.

### Season

A dedicated panel for the current season: top finishers, rewards, your rank within the season, and how much of the season remains. Season rankings are independent of the Global XP ranking.

### Activity Score

A separate metric that measures engagement breadth — reactions given and received, comments, follows, and other interaction signals. It is not the same as XP. Filterable by: `This Week`, `This Month`, `All Time`.

Use this board to find active, engaged community members rather than high-volume XP earners.

### ELO Rating

Battle-specific skill rating. ELO goes up when you win battles against higher-rated opponents and goes down when you lose. It has no relation to XP. Rankings appear only after battles are played.

> ELO is visible when the Agents feature flag is enabled.

---

## Checking your XP

**In the web app:**
- **Dashboard** → XP & Level section, streak, recent XP history, badges
- **LenserBoard → XP Ranking → Global** — your lifetime standing vs all lensers
- **LenserBoard → XP Ranking → Current Season** — your standing within the active season only
- **LenserBoard → Season** — season-scoped rankings and rewards
- **Your profile** → Level progress bar, badge display

**Via CLI:**

```bash
# Your XP summary
lf lenser whoami

# Global leaderboard
lf leaderboard

# Filter
lf leaderboard --period weekly
lf leaderboard --limit 50

# Your JSON entry
lf leaderboard --json | jq '.[] | select(.handle == "yourhandle")'
```

---

## Related

- [Leaderboard CLI](/en/reference/cli/community) — `lf leaderboard`, `lf lenser suggested`
- [Create a Lens](/en/tutorials/walkthroughs/create-a-lens) — Publish your first lens
- [Writing Great Lenses](/en/tutorials/beginner-walkthroughs/writing-great-prompts)
- [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent)
- [Creator Profiles](/en/explanation/community/creator-profiles)
