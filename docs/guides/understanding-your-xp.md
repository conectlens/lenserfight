# Understanding Your XP

This guide explains where to find your XP, what actions earn XP, and how the progression system works.

## Where to See Your XP

- **Leaderboard page** — accessible from the sidebar. Shows your rank, total XP, and level alongside other lensers.
- **Profile** — your XP summary appears on your profile page.
- **XP History** — view your recent XP events to see exactly which actions earned points.

## Actions That Earn XP

### Forum Actions

| Action | XP Earned | Cooldown |
|--------|----------|---------|
| Create a thread | 20 | 60 seconds |
| Reply to a thread | 12 | 30 seconds |
| Create a prompt | 30 | 2 minutes |
| Give a reaction | 4 | 5 seconds |
| Receive a reaction | ~2 | None |
| Receive a reply | 4 | None |
| Daily login | 8 | Once per day |

### Arena Actions

| Action | XP Earned | Notes |
|--------|----------|-------|
| Create a battle | 300 | Hard difficulty (1.5x) |
| Join a battle | 225 | Hard difficulty (1.5x) |
| Win a battle | 900 | Legendary difficulty (3.0x) |
| Vote on a battle | 20 | Standard difficulty |

### CLI Actions

| Action | XP Earned |
|--------|----------|
| Initialize the CLI | 150 |
| Deploy via CLI | ~112 |

### Contributing

| Action | XP Earned |
|--------|----------|
| Merge a PR to the main project | 1500 |
| Merge a community plugin PR | 300 |
| Merge a docs PR | 100 |
| Review a PR | 75 |
| File an issue | 30 |

## Daily Caps

Each action has a daily XP cap. Once you hit the cap, you stop earning XP for that specific action until the next day. Other actions still earn normally.

For example, forum thread creation caps at 200 XP per day. After creating about 10 threads (20 XP each), you will not earn more thread-creation XP until tomorrow.

## Cooldowns

Rapid repetition of the same action is limited by cooldowns. If you create a thread and try to create another within 60 seconds, the second one will not earn XP.

Cooldowns are per-action, per-app. Different actions have independent cooldowns.

## Levels

Your level increases as your total XP crosses thresholds. Each app (Forum, Arena, CLI) has its own level curve:

- **Forum**: Easier progression (level 10 at ~600 XP)
- **Arena**: Harder progression (level 10 at ~3,200 XP)
- **CLI**: Medium-hard progression (level 10 at ~1,900 XP)

Higher levels require exponentially more XP. This is by design: early levels reward getting started, while high levels reward dedication.

## Streaks

Actions with a streak type (like daily login or daily content creation) track consecutive-day activity:

- Continue the streak by performing the action every day
- Miss a day and the current streak resets to 0
- Your longest streak is always preserved
- Streak milestones (7, 30, 100 days) earn badges

## Seasons

Seasons are 90-day competitive periods. During a season:

- A separate leaderboard tracks seasonal XP
- Season rankings refresh with each new season
- Your all-time XP and level are never affected by season resets

New seasons start automatically when the previous one ends.

## Badges

Badges are awarded at milestones:

- **Level badges**: Level 5, 10, 20, 30
- **Streak badges**: 7-day, 30-day, 100-day
- **Activity badges**: Content Creator, Battle Participant
- **Community badges**: Early Adopter, Founder, Mentor
