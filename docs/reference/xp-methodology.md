# XP Methodology

This document explains the mathematical foundations, design decisions, and anti-gaming measures behind LenserFight's XP system.

## XP Calculation Formula

```
effective_xp = CEIL(base_xp * difficulty_multiplier)
```

Where:
- `base_xp` is defined per rule in `xp.rules`
- `difficulty_multiplier` is looked up from `xp.difficulty_multipliers` based on the rule's `difficulty` column

Both `base_xp` (raw) and `effective_xp` (multiplied) are stored in `xp.events` for full auditability.

## Difficulty Scaling Rationale

The difficulty system exists because different actions require different levels of effort:

| Level | Why | Example |
|-------|-----|---------|
| Easy (0.8x) | Actions anyone can do frequently with minimal effort | Giving a reaction, logging in |
| Standard (1.0x) | Actions requiring thought or creation | Writing a Lens, filing an issue |
| Hard (1.5x) | Actions requiring preparation, skill, or technical setup | Battle participation, CLI deployment, code review |
| Legendary (3.0x) | Actions requiring significant expertise and producing high-value outcomes | Winning a battle, merging a core PR |

The multiplier values (0.8, 1.0, 1.5, 3.0) were chosen to create meaningful differentiation without extreme outliers. A legendary action is worth ~3.75x an easy action at the same base_xp.

## Level Curve Design

Level curves use a power-law formula:

```
increment(level) = CEIL(base * level^power)
min_xp(level) = SUM(increment(1..level-1))
max_xp(level) = SUM(increment(1..level))
```

### Parameter Selection

| Parameter | Effect |
|-----------|--------|
| `base` | Controls absolute XP scale; higher = more XP per level |
| `power` | Controls steepness; higher = exponentially harder later levels |

- **Forum** (`base=30, power=1.3`): Gentle curve. Players level frequently, rewarding consistent casual engagement.
- **Arena** (`base=80, power=1.6`): Steep curve. High levels are rare and prestigious, reflecting competitive depth.
- **CLI** (`base=60, power=1.5`): Medium curve. Rewards developer commitment without making early levels inaccessible.
- **Auth** (`base=20, power=1.2, max=20`): Flat curve, few levels. Account setup is one-time.

### Why Power-Law Over Linear

Linear curves (`increment = constant`) make every level feel the same. Power-law curves create the "easy early, hard late" feel:
- Early levels take minutes to hours
- Mid levels take days
- Late levels take weeks to months

This matches engagement psychology: quick rewards hook new users; deep rewards retain veterans.

## Anti-Gaming Measures

### Cooldowns

Each rule can define a `cooldown_seconds` value. If a user triggers the same action within the cooldown window, no XP is awarded. This prevents:
- Spam-clicking reactions for XP
- Automated rapid posting
- Script-driven thread creation

### Daily Caps

Two independent daily caps:
1. **`max_events_per_day`**: Maximum number of XP-earning events for this action
2. **`max_xp_per_day`**: Maximum total XP from this action type

The event cap prevents volume abuse. The XP cap prevents high-multiplier rules from dominating daily earnings.

### Season Caps

`max_xp_per_season` limits total XP from a single action across an entire season. This is primarily used for contributor actions to prevent over-accumulation from prolific open-source work.

### Immutable Events

XP events cannot be modified after creation. The `trg_no_update_events` trigger rejects all UPDATE operations (except by service_role). This ensures the audit trail is tamper-proof.

### Rollback Mechanism

If an XP event needs to be reversed (e.g., content was spam), `xp.rollback_event()` subtracts the XP from totals and recomputes the level. The original event remains in the log for auditing.

## Lenser Score Formula

The leaderboard uses a composite score:

```
lenser_score = 0.7 * log(total_xp) + 0.3 * log(recent_reactions_7d)
```

- 70% weight on cumulative XP (long-term engagement)
- 30% weight on recent activity (current participation)
- Logarithmic scale prevents extreme outliers from dominating

## Season Design

### Why 90 Days

- Short enough to maintain competitive urgency
- Long enough to allow meaningful progression
- Aligns with quarterly planning cycles
- Historical data is never deleted; only the `is_active` flag changes

### Automatic Rollover

`xp.check_all_seasons()` runs daily via pg_cron. When a season's `ends_at` passes:

1. The season is marked `is_active = false`
2. A new season is created starting where the old one ended (no gaps)
3. If the gap exceeds 7 days (e.g., system was down), the new season starts from now

### Season Totals Independence

Season totals are separate from all-time totals. Leveling up uses all-time XP; seasonal leaderboards use season-scoped XP. A season reset never reduces your level.

## Future Considerations

- **Dynamic difficulty**: Adjust multipliers based on platform-wide activity (if an action becomes too common, reduce its multiplier)
- **Quest system**: Structured multi-step challenges using the existing `challenge` source_enum
- **Streak multipliers**: Multiply XP by streak length (e.g., 1.1x at 7 days, 1.2x at 30 days)
- **Cross-app XP**: Aggregate XP across apps for a unified "Lenser Level"
