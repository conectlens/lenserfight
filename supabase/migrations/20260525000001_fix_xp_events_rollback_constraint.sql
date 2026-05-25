-- Fix: ck_xp_events_xp_nonneg blocked rollback events that legitimately carry
-- negative xp to compensate the original award.
-- New rule: xp >= 0 for normal events; any integer allowed for *_ROLLBACK events.
ALTER TABLE xp.events
  DROP CONSTRAINT ck_xp_events_xp_nonneg;

ALTER TABLE xp.events
  ADD CONSTRAINT ck_xp_events_xp_nonneg
    CHECK (xp >= 0 OR action_key LIKE '%\_ROLLBACK');
