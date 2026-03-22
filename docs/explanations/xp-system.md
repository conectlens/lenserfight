# XP System

LenserFight awards experience points (XP) for meaningful actions across the platform. XP drives your level, badges, streaks, and seasonal rankings.

## Design Principles

- **Fairness first.** XP reflects effort, not luck. Difficult actions earn more than easy ones.
- **No pay-to-win.** XP cannot be purchased, traded, or converted to money. It is separate from the token economy.
- **Anti-gaming.** Cooldowns, daily caps, and seasonal limits prevent XP farming.
- **Multi-app awareness.** Forum, Arena, and CLI are distinct apps with different difficulty profiles.

## How XP Works

Every XP-earning action has a **rule** that defines:

1. **Base XP** — the raw amount before scaling
2. **Difficulty** — `easy`, `standard`, `hard`, or `legendary`
3. **Cooldown** — minimum seconds between repeat awards
4. **Daily cap** — maximum XP per day for that action
5. **Season cap** — maximum XP per season (for contributor actions)

The difficulty multiplier scales the base XP:

| Difficulty | Multiplier | Example |
|-----------|-----------|---------|
| Easy | 0.80x | Giving a reaction (5 base = 4 XP) |
| Standard | 1.00x | Creating a Lens (30 base = 30 XP) |
| Hard | 1.50x | Joining a battle (150 base = 225 XP) |
| Legendary | 3.00x | Winning a battle (300 base = 900 XP) |

## Apps and Difficulty

Different parts of LenserFight have different difficulty ratings because they require different levels of effort:

### Forum (Easy)
Creating threads, replying, reacting. The forum is the entry point — actions are lightweight and frequent. XP per action is lower, but it adds up.

### Arena (Hard)
Creating battles, contending against other lensers, winning. Arena actions require preparation, skill, and competitive effort. XP rewards are significantly higher.

### CLI (Hard)
Initializing the CLI, deploying from the command line. These actions require technical setup and developer skills.

### Auth (Easy)
Account creation and profile completion. One-time actions with small XP rewards.

## Levels

Each app has its own level curve. Forum levels are easier to reach than Arena levels. Your level reflects your depth of engagement within that specific part of the platform.

Level curves follow a power-law formula: higher levels require exponentially more XP. Early levels are quick; later levels reward long-term dedication.

## Streaks

Some actions track daily streaks. If you perform the action on consecutive days, your streak counter increases. Streak milestones unlock badges:

- 7-day streak
- 30-day streak
- 100-day streak

Missing a day resets the current streak, but your longest streak is always preserved.

## Seasons

XP seasons run for 90 days. During a season, your seasonal XP accumulates on a separate leaderboard. When a season ends:

- Your seasonal XP is archived (never deleted)
- A new season begins automatically
- Your all-time XP and level are unaffected

Seasons add competitive cycles without penalizing long-term progress.

## Contributor XP

Open-source contributors to LenserFight earn XP for their work. Contributing to the main project is the highest-priority action in the entire system.

| Contribution | Effective XP |
|-------------|-------------|
| PR merged (main project) | 1500 |
| PR merged (community plugin) | 300 |
| PR merged (documentation) | 100 |
| Code review given | 75 |
| Issue filed | 30 |

Contributor XP has seasonal caps to prevent over-accumulation.

## What XP Is Not

- XP does not grant access to features
- XP does not affect battle outcomes
- XP cannot be exchanged for tokens or money
- XP is not used to gate content

XP is a social signal of engagement and contribution. It powers leaderboards, badges, and community recognition.
