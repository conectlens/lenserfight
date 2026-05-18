-- =============================================================================
-- Pre-Launch XP / ELO / Activity Data Reset
-- =============================================================================
-- Clears all earned/transactional XP, ELO, season totals, streaks, badges,
-- and activity-event data so every production lenser starts at zero.
--
-- PRESERVED (configuration / reference):
--   xp.seasons              S1–S9 slug and date range definitions
--   xp.rules                XP earning rule configuration
--   xp.levels               Level threshold definitions
--   xp.apps                 App registry
--   xp.difficulty_multipliers
--   xp.policy
--
-- Idempotent: all DELETE / UPDATE — safe to re-run on an already-clean DB.
-- =============================================================================

-- ── 1. XP event dependents (FK order: dependents before xp.events) ───────────
DELETE FROM xp.event_verifications;
DELETE FROM xp.level_ups;
DELETE FROM xp.contributions;
DELETE FROM lensers.badges;       -- optional xp_event_id FK → xp.events
DELETE FROM xp.events;

-- ── 2. XP aggregate rollups ───────────────────────────────────────────────────
DELETE FROM xp.streaks;
DELETE FROM xp.monthly_rollup;
DELETE FROM xp.season_totals;    -- references xp.seasons (kept)
DELETE FROM xp.totals;

-- ── 3. ELO / reputation scores ────────────────────────────────────────────────
DELETE FROM reputation.vote_risk_scores;
DELETE FROM reputation.judge_calibrations;
DELETE FROM reputation.elo_battle_log;
DELETE FROM reputation.contender_ratings;
DELETE FROM reputation.lenser_scores;

-- ── 4. Activity event logs ───────────────────────────────────────────────────
DELETE FROM analytics.tag_activity_events;
DELETE FROM analytics.lenser_activity;

-- ── 5. Denormalized XP + badge counters ──────────────────────────────────────
-- Preserves follower_count / following_count / lens_count / thread_count.
UPDATE analytics.lenser_stats
SET xp = 0, badges_count = 0;
