# Schema: xp

The `xp` schema implements LenserFight's experience point and progression system. XP is awarded for platform actions (creating content, participating in battles, voting) and drives leveling, streaks, and seasons.

## Tables

### rules

Defines what actions earn XP and their constraints.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `app_id` | uuid | Application scope (default `00000000-...`) |
| `action_key` | text | Unique action identifier, e.g., `THREAD_CREATED`, `battle_participated` |
| `name` | text | Human-readable name |
| `description` | text | |
| `base_xp` | integer | XP awarded per event |
| `max_xp_per_day` | integer | Daily cap (NULL = unlimited) |
| `max_events_per_day` | integer | Event count cap |
| `cooldown_seconds` | integer | Minimum time between awards |
| `max_xp_per_season` | integer | Season cap |
| `streak_type` | text | Optional streak tracking |
| `signature_required` | boolean | Whether event needs verification |
| `metadata` | jsonb | Flexible metadata |
| `is_active` | boolean | Enable/disable rule |

### events

Log of every XP award.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `lenser_id` | uuid | FK → `lensers.profiles` |
| `app_id` | uuid | Application scope |
| `rule_id` | uuid | FK → rules |
| `action_key` | text | Denormalized from rule |
| `xp` | integer | XP awarded (may differ from base_xp with multipliers) |
| `base_xp` | integer | Original base amount |
| `source` | `source_enum` | `system`, `ai`, `battle`, `challenge`, `daily`, `referral`, `social`, `content`, `other` |
| `source_ref_type` | text | e.g., `thread`, `battle` |
| `source_ref_id` | uuid | Reference to source entity |
| `signature` | text | Optional verification signature |
| `ai_verified` | boolean | Whether AI verified the action |
| `meta` | jsonb | Additional context |

### totals

Aggregated XP per lenser per app.

| Column | Type | Notes |
|--------|------|-------|
| `lenser_id` | uuid | Composite PK with `app_id` |
| `app_id` | uuid | Composite PK |
| `total_xp` | bigint | Accumulated XP |
| `current_level` | integer | Derived from total_xp |

### levels, streaks, seasons

Supporting tables for progression mechanics (level thresholds, streak tracking, seasonal resets).

## The `xp.apply()` function

Central function for awarding XP. Called by triggers and RPC functions.

```sql
xp.apply(
    p_lenser_id       uuid,
    p_rule_key        text,         -- matches rules.action_key
    p_source          source_enum,  -- e.g., 'battle', 'content'
    p_source_ref_type text,         -- e.g., 'battle', 'thread'
    p_source_ref_id   uuid,         -- ID of the source entity
    p_app_id          uuid DEFAULT '00000000-0000-0000-0000-000000000000'
) RETURNS void
```

**Behavior:**
1. Loads the matching active rule by `action_key`
2. Checks cooldown (time since last event)
3. Checks daily event count limit
4. Checks daily XP cap
5. Checks seasonal XP cap
6. Inserts `xp.events` row
7. Upserts `xp.totals` (increment total_xp)

**Battle XP rules** (seeded in the battles migration):

| Action Key | Base XP | Daily Cap | Description |
|------------|---------|-----------|-------------|
| `battle_participated` | 50 | 100 XP/day | Awarded to human contenders |
| `battle_won` | 200 | 200 XP/day | Awarded to the winning contender |
| `battle_voted` | 10 | 50 XP/day | Awarded to voters |

## Enums

| Enum | Values |
|------|--------|
| `source_enum` | `system`, `ai`, `battle`, `challenge`, `daily`, `referral`, `social`, `content`, `other` |
| `difficulty_enum` | `easy`, `standard`, `hard`, `legendary` |
