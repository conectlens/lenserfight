# XP Methodology

Mathematical foundations, design decisions, and anti-gaming measures behind LenserFight's XP system.

## XP Calculation Formula

```
effective_xp = CEIL(base_xp × difficulty_multiplier)
```

Both `base_xp` (raw) and `effective_xp` (multiplied) are stored in `xp.events` for full auditability.

## Difficulty Scaling

| Difficulty | Multiplier | Rationale |
|-----------|-----------|-----------|
| easy | ×0.75 | Actions anyone can do frequently with minimal effort |
| standard | ×1.00 | Actions requiring thought, creation, or moderation |
| hard | ×1.50 | Actions requiring skill, preparation, or technical setup |
| legendary | ×2.50 | Actions requiring expertise and producing exceptional value |

A legendary action is worth ~3.3× an easy action at the same `base_xp`. The spread is intentional: it creates strong incentives for high-effort behavior without making casual actions feel worthless.

## Level Curve Design

Level curves use a polynomial formula:

```
increment(level) = CEIL(base × level^power)
min_xp(level)    = SUM(increment(1 .. level−1))
max_xp(level)    = SUM(increment(1 .. level))
```

### Parameters

Both apps use the same parameters:

| Parameter | Value | Effect |
|-----------|-------|--------|
| `base` | 150 | Controls absolute XP scale per level |
| `power` | 0.75 | Sub-linear power — early levels are fast; later levels slow down gently |
| `max_level` | 100 | Champion tier; achievable over 5+ years of dedicated play |

### Level Checkpoints

| Level | Min XP to reach | Annual user who reaches it |
|-------|----------------|--------------------------|
| 10 | ~4,400 | Casual after 6 months |
| 25 | ~22,500 | Casual after ~2 years, regular after 9 months |
| 50 | ~92,000 | Regular after ~2.5 years, power after ~1.5 years |
| 75 | ~191,000 | Power user after ~3 years |
| 100 | ~330,000 | Elite after 5+ years |

### Why sub-linear (`power < 1`) vs steeper curves

A power of 0.75 means the XP increment *per level* grows slowly — the gap between level 5 and level 6 is smaller than the gap between level 95 and 96, but not by a huge amount. This was chosen to:

- Avoid the "wall" effect where mid-game progress stalls completely
- Keep levels 10–40 feeling achievable for regular users within 1–2 years
- Still make level 75–100 rare and prestigious

A steeper curve (power ≥ 1.5) would make levels 50+ effectively unreachable for anyone except extreme power users.

## Visibility Policy

Creation XP (LENS_CREATED, THREAD_CREATED, WORKFLOW_CREATED) is only awarded when content is **public and published**. The database enforces this:

1. **INSERT trigger** checks `visibility = 'public' AND status = 'published'` before calling `xp.apply()`. Private drafts earn nothing.
2. **UPDATE trigger** fires when `visibility` or `status` changes:
   - Public+published → non-public: `xp.rollback_content_xp()` is called, inserting a compensating negative event.
   - Non-public → public+published: `xp.apply()` is called if no prior positive event exists for that content.
3. **Engagement XP** (reactions, replies, votes, views) is never rolled back — those interactions happened regardless of later visibility changes.

This prevents the most common manipulation pattern: post publicly to harvest creation XP, then immediately make private.

## Anti-Gaming Measures

### Cooldowns

`cooldown_seconds` is enforced inside `xp.apply()` by querying the most recent event for the same `(lenser_id, action_key, app_id)` tuple. If the elapsed time is less than the cooldown, no XP is awarded. Prevents:
- Spam-clicking reactions
- Automated rapid posting
- Script-driven thread creation

### Daily Caps

Two independent daily caps per rule:

| Cap | What it limits |
|-----|---------------|
| `max_events_per_day` | Number of XP-earning events for this action type |
| `max_xp_per_day` | Total XP from this action type in a calendar day |

The event cap prevents volume abuse. The XP cap prevents high-multiplier rules from dominating daily earnings even at low event counts.

### Season Caps

`max_xp_per_season` limits total XP from a single action type across a 90-day season. Used on every rule to prevent any single behavior from monopolizing the leaderboard.

### Concurrency Safety

`xp.apply()` acquires a per-lenser advisory lock (`pg_advisory_xact_lock`) before reading caps or inserting events. This serializes concurrent XP awards for the same user and prevents race conditions on daily/season cap checks.

### Immutable Event Log

XP events cannot be modified after creation. The `trg_no_update_events` trigger rejects all UPDATE operations (except by `service_role`). The audit trail is tamper-proof.

### Rollback Mechanism

When XP must be reversed (content made private, moderation action), `xp.rollback_event()` inserts a compensating negative event. The original event remains in the log. XP totals and levels are immediately recalculated.

### Self-Interaction Prevention

Received-type rules (REACTION_RECEIVED, THREAD_REPLY_RECEIVED, WORKFLOW_LIKE_RECEIVED, etc.) include a check that the actor is not the same person as the content owner. This prevents users from self-reacting or self-replying to earn received XP.

## Lenser Score Formula

The leaderboard uses a composite score:

```
lenser_score = 0.7 × log(total_xp) + 0.3 × log(recent_reactions_7d)
```

- 70% weight on cumulative XP (long-term engagement)
- 30% weight on recent reactions received (current participation signal)
- Logarithmic scale prevents extreme outliers from dominating rankings

## Season Design

### Why 90 Days

- Short enough to create competitive urgency and allow new users to reach the top
- Long enough for meaningful progression (most rules have per-season caps that fill over weeks)
- Aligns with quarterly planning cycles

### Automatic Rollover

Seasons roll over automatically at their scheduled end date. When a season ends:

1. The season is marked `is_active = false`
2. A new season is created starting immediately after
3. If the gap exceeds 7 days (system outage), the new season starts from now

### Season Totals Independence

Season totals are separate from all-time totals. Leveling up uses all-time XP; seasonal leaderboards use season-scoped XP. A season reset never reduces your level.

## Future Considerations

- **Dynamic multipliers**: Adjust rule multipliers if a single action type becomes too dominant platform-wide
- **Quest system**: Multi-step challenges using the `challenge` source enum (infrastructure already exists)
- **Streak multipliers**: Multiply XP by streak length (e.g., ×1.1 at 7 days, ×1.2 at 30 days)
