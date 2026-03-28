# XP Rules Reference

Complete reference of all XP rules and their configuration.

## Difficulty Multipliers

| Difficulty | Multiplier | Typical actions |
|-----------|-----------|----------------|
| `easy` | ×0.75 | Reactions, logins, views |
| `standard` | ×1.00 | Thread creation, code reviews, votes |
| `hard` | ×1.50 | Lens creation, workflow creation, battle participation |
| `legendary` | ×2.50 | Battle wins, core OSS contributions |

**Formula:** `effective_xp = CEIL(base_xp × multiplier)`

## Apps

| Slug | UUID | Difficulty profile |
|------|------|-------------------|
| `forum` | `00000000-0000-0000-0000-000000000001` | standard |
| `battles` | `00000000-0000-0000-0000-000000000002` | hard |

---

## Forum Rules

### Content Creation

Only **public + published** content earns creation XP. Creating a private draft awards nothing. Publishing or making content public retroactively awards the XP (if not already awarded). Making content private or archiving it **reverses** the creation XP.

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|-----------|--------------|
| `LENS_CREATED` | 80 | hard | **120** | 60 min | 5 | 400 | 2,000 |
| `THREAD_CREATED` | 30 | standard | **30** | 30 min | 10 | 200 | 1,500 |
| `THREAD_REPLY_CREATED` | 15 | easy | **12** | 5 min | 20 | 200 | 1,200 |
| `WORKFLOW_CREATED` | 60 | hard | **90** | 60 min | 3 | 180 | 1,500 |

### Social — Giving

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|-----------|--------------|
| `REACTION_GIVEN` | 5 | easy | **4** | 60 s | 30 | 100 | 500 |
| `WORKFLOW_LIKED` | 5 | easy | **4** | 2 min | 20 | 80 | 400 |
| `WORKFLOW_SAVED` | 8 | easy | **6** | 5 min | 10 | 60 | 300 |
| `WORKFLOW_FORKED` | 20 | standard | **20** | 30 min | 5 | 80 | 400 |
| `LENS_FORKED` | 20 | standard | **20** | 30 min | 5 | 80 | 400 |

### Social — Receiving

No cooldown applies — you cannot control when others interact with your content. Self-interaction is blocked (reacting to or replying to your own content does not award received XP).

| action_key | Base XP | Difficulty | Effective XP | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------------|-----------|--------------|
| `REACTION_RECEIVED` | 8 | easy | **6** | 50 | 300 | 1,500 |
| `THREAD_REPLY_RECEIVED` | 10 | easy | **8** | 30 | 200 | 1,200 |
| `WORKFLOW_LIKE_RECEIVED` | 8 | easy | **6** | 30 | 200 | 1,000 |
| `WORKFLOW_SAVE_RECEIVED` | 12 | easy | **9** | 20 | 200 | 800 |
| `WORKFLOW_FORK_RECEIVED` | 25 | standard | **25** | 10 | 200 | 800 |
| `LENS_FORK_RECEIVED` | 25 | standard | **25** | 10 | 200 | 800 |

### Engagement

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|-----------|--------------|
| `THREAD_ENGAGED` | 3 | easy | **3** | 60 min | 5 | 10 | 60 |

### Daily Activity & Streaks

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/season | Streak type |
|-----------|--------|-----------|-------------|---------|---------------|--------------|------------|
| `DAILY_LOGIN` | 10 | easy | **8** | 23 h | 1 | 900 | `daily` |
| `STREAK_BONUS_7D` | 50 | standard | **50** | 7 days | 1 | 400 | `daily` |
| `STREAK_BONUS_30D` | 150 | hard | **225** | 30 days | 1 | 600 | `daily` |

The 23-hour cooldown on `DAILY_LOGIN` (not 24 h) prevents gradual drift for users in different timezones.

### Profile & Social Graph

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|--------------|
| `PROFILE_COMPLETED` | 100 | standard | **100** | — | 1 | 100 |
| `FOLLOW_RECEIVED` | 5 | easy | **4** | — | 20 | 400 |

`PROFILE_COMPLETED` is effectively one-time: the trigger checks for an existing positive event before awarding, and the season cap ensures the max lifetime award is 100 XP.

### Open-Source Contributions

Awarded by `xp.grant_contribution_xp()` after external verification (GitHub webhook or admin grant). See [XP for Contributors](/how-to/contributors/xp-for-contributors).

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|-----------|--------------|
| `CONTRIB_PR_MERGED_MAIN` | 500 | legendary | **1,250** | — | 2 | 1,000 | 3,000 |
| `CONTRIB_PR_MERGED_COMMUNITY` | 200 | hard | **300** | — | 3 | 600 | 2,000 |
| `CONTRIB_PR_MERGED_DOCS` | 100 | standard | **100** | — | 5 | 400 | 1,500 |
| `CONTRIB_ISSUE_FILED` | 30 | easy | **23** | 60 min | 5 | 100 | 500 |
| `CONTRIB_REVIEW_GIVEN` | 40 | standard | **40** | 30 min | 5 | 150 | 600 |

---

## Battles Rules

Battle XP is awarded when a battle transitions to `closed` status (`battles.award_battle_xp` trigger). `BATTLE_CREATED` is awarded when a battle is created in a non-draft status, or when a draft battle is first published.

| action_key | Base XP | Difficulty | Effective XP | Cooldown | Max events/day | Max XP/day | Max XP/season |
|-----------|--------|-----------|-------------|---------|---------------|-----------|--------------|
| `BATTLE_CREATED` | 50 | standard | **50** | 2 h | 2 | 100 | 800 |
| `BATTLE_PARTICIPATED` | 100 | hard | **150** | — | 5 | 500 | 2,000 |
| `BATTLE_WON` | 150 | legendary | **375** | — | 5 | 750 | 2,500 |
| `BATTLE_VOTED` | 10 | easy | **8** | 10 min | 20 | 200 | 1,000 |

---

## Level Curve

The platform uses a sub-linear polynomial progression. Early levels advance quickly; later levels represent long-term dedication.

| Level | Min XP to reach | Max XP at level |
|-------|----------------|----------------|
| 1 | 0 | 150 |
| 5 | ~820 | ~1,010 |
| 10 | ~4,400 | ~5,100 |
| 15 | ~9,400 | ~10,500 |
| 25 | ~22,500 | ~24,300 |
| 35 | ~40,800 | ~43,300 |
| 50 | ~92,000 | ~96,200 |
| 75 | ~191,000 | ~197,000 |
| 100 | ~330,000 | — (cap) |

**XP bands** (annual targets):

| User type | Typical activity | XP/year | Approx. level after 1 year |
|-----------|-----------------|---------|--------------------------|
| Casual | 1–2×/week | 5,000–15,000 | 10–22 |
| Regular | Daily engagement | 20,000–40,000 | 28–42 |
| Power | High-volume daily | 40,000–80,000 | 42–60 |

---

## Season Configuration

| Parameter | Value |
|-----------|-------|
| Duration | 90 days |
| Automatic rollover | Seasons roll over automatically at their end date — a new season begins immediately after |
| Slug format | `s{n}_{app_slug}` (e.g., `s1_forum`, `s2_battles`) |
| Season XP vs all-time | Independent — a season reset never reduces your level |
| Historical data | Never deleted |
