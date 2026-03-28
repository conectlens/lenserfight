# XP System

LenserFight awards experience points (XP) for meaningful actions across the platform. XP drives your level, streaks, and seasonal rankings.

## Design Principles

- **Fairness first.** XP reflects real contribution. Difficult actions earn more than easy ones.
- **No pay-to-win.** XP cannot be purchased, traded, or converted to money. It is separate from the token economy.
- **Anti-gaming.** Cooldowns, daily caps, and seasonal limits prevent XP farming.
- **Visibility-honest.** Only public content grants creation XP. Making content private reverses it.
- **Self-interaction blocked.** Reacting to or replying to your own content does not award received-type XP.

## How XP Works

Every XP-earning action has a **rule** that defines:

1. **Base XP** — the raw amount before scaling
2. **Difficulty** — `easy`, `standard`, `hard`, or `legendary`
3. **Cooldown** — minimum seconds between repeat awards for the same action
4. **Daily cap** — maximum XP per day from that action type
5. **Season cap** — maximum XP per 90-day season from that action type

The difficulty multiplier scales the base XP:

| Difficulty | Multiplier | Example |
|-----------|-----------|---------|
| easy | ×0.75 | Giving a reaction (5 base → 4 XP) |
| standard | ×1.00 | Creating a thread (30 base → 30 XP) |
| hard | ×1.50 | Publishing a lens (80 base → 120 XP) |
| legendary | ×2.50 | Winning a battle (150 base → 375 XP) |

## Apps

LenserFight has two XP apps, each with its own ruleset and level curve:

| App | UUID suffix | Focus |
|-----|------------|-------|
| **Forum** | `...0001` | Content, social, contributions |
| **Battles** | `...0002` | Competitive battle actions |

## What Earns XP

### Content Creation

Creating a **public + published** lens, thread, or workflow earns creation XP. Drafts and private content do not. The rule applies at the moment content becomes public:

- Publishing a draft publicly → XP awarded
- Creating content publicly from the start → XP awarded immediately
- Making public content private or archiving → creation XP is **reversed**
- Re-publishing previously private content → XP re-awarded (if not previously awarded)

See [XP Rules Reference](/reference/platform-api/xp-rules-reference) for all values.

### Social Actions

| Category | Examples | Notes |
|----------|---------|-------|
| Giving | Reacting, liking, saving, forking workflows and lenses | Subject to cooldowns and daily caps |
| Receiving | Getting reactions, replies, likes, forks | No cooldown (you don't control arrivals); self-interaction blocked |
| Engagement | Reading threads | Very low value; heavily capped |

### Battles

| Action | Effective XP |
|--------|-------------|
| Create a battle | 50 |
| Participate in a battle | 150 |
| Win a battle | **375** |
| Vote on a battle | 8 |

Battle XP (participate, win, vote) is awarded when a battle transitions to `closed` status — after judging completes, not when you join.

### Daily Activity & Streaks

| Action | Effective XP | Notes |
|--------|-------------|-------|
| Daily login | 8 | 23-hour cooldown; once per day |
| 7-day streak bonus | 50 | Once per 7-day period |
| 30-day streak bonus | 225 | Once per 30-day period |

Missing a day resets your current streak, but your longest streak is always preserved.

### Open-Source Contributions

Contributing to LenserFight earns the highest XP in the system:

| Contribution | Effective XP |
|-------------|-------------|
| PR merged (main project) | **1,250** |
| PR merged (community plugin/infra) | 300 |
| PR merged (documentation) | 100 |
| Code review given | 40 |
| Issue filed | 23 |

See [XP for Contributors](/how-to/contributors/xp-for-contributors).

## Levels

Both apps use the same 100-level polynomial curve (`base=150, power=0.75`):

| Level | XP to reach |
|-------|------------|
| 10 | ~4,400 |
| 25 | ~22,500 |
| 50 | ~92,000 |
| 75 | ~191,000 |
| 100 | ~330,000 |

Early levels come quickly to reward getting started. High levels reflect months or years of sustained engagement.

## Seasons

XP seasons run for 90 days. During a season, your seasonal XP accumulates on a separate leaderboard. When a season ends:

- Seasonal XP is archived (never deleted)
- A new season starts automatically
- Your all-time XP and level are never affected

## What XP Is Not

- XP does not grant access to features
- XP does not affect battle outcomes or judging
- XP cannot be exchanged for tokens or money
- XP is not used to gate content

XP is a social signal of engagement and contribution. It powers leaderboards and community recognition.
