-- =============================================================================
-- pgTAP — Phase 90: Lenser Family invariants
-- =============================================================================
-- Guards the four canonical Lenser Family AI Lensers seeded by
-- supabase/seeds/08_lenser_family.sql. Catches regressions on:
--   • handles  (@lenso, @lensa, @lense, @lola)
--   • type     (ai)
--   • visibility (public)
--   • status   (active)
--   • avatar   (cdn.lenserfight.com/brand/lensers/{NAME}_DNA.png)
--   • ownership (every family Lenser owned by @lenserfight)
--   • policy   (is_public_policy=true, can_join_battles, can_vote)
--   • personality_note (non-empty JSON, carries the family key)
--   • spending (no autonomous credit spend)
-- See: docs/en/explanation/lensers/family/
-- =============================================================================
BEGIN;

SELECT plan(14);

-- 1. All four family handles exist.
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE handle IN ('lenso','lensa','lense','lola')),
  4,
  'all four Lenser Family handles (@lenso, @lensa, @lense, @lola) must exist'
);

-- 2. All four are type = 'ai'.
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE handle IN ('lenso','lensa','lense','lola')
     AND type = 'ai'::lensers.lenser_type),
  4,
  'all four Lenser Family profiles must be type=ai'
);

-- 3. All four are visibility = 'public'.
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE handle IN ('lenso','lensa','lense','lola')
     AND visibility = 'public'::lensers.lenser_visibility),
  4,
  'all four Lenser Family profiles must be visibility=public'
);

-- 4. All four are status = 'active'.
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE handle IN ('lenso','lensa','lense','lola')
     AND status = 'active'::lensers.lenser_status),
  4,
  'all four Lenser Family profiles must be status=active'
);

-- 5. Each avatar points at the correct CDN DNA PNG.
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE (handle = 'lenso' AND avatar_url = 'https://cdn.lenserfight.com/brand/lensers/LENSO_DNA.png')
      OR (handle = 'lensa' AND avatar_url = 'https://cdn.lenserfight.com/brand/lensers/LENSA_DNA.png')
      OR (handle = 'lense' AND avatar_url = 'https://cdn.lenserfight.com/brand/lensers/LENSE_DNA.png')
      OR (handle = 'lola'  AND avatar_url = 'https://cdn.lenserfight.com/brand/lensers/LOLA_DNA.png')),
  4,
  'each family Lenser avatar_url must point at its canonical {NAME}_DNA.png'
);

-- 6. Stable UUIDs are preserved (so existing FKs survive reseeds).
SELECT is(
  (SELECT count(*)::int FROM lensers.profiles
   WHERE (handle = 'lenso' AND id = 'd4000000-0000-0000-0000-000000000001'::uuid)
      OR (handle = 'lensa' AND id = 'd4000000-0000-0000-0000-000000000002'::uuid)
      OR (handle = 'lense' AND id = 'd4000000-0000-0000-0000-000000000003'::uuid)
      OR (handle = 'lola'  AND id = 'd4000000-0000-0000-0000-000000000004'::uuid)),
  4,
  'family Lenser UUIDs (d4000000-…-001..004) must be stable across reseeds'
);

-- 7. Every family Lenser has an agents.ai_lensers extension row.
SELECT is(
  (SELECT count(*)::int FROM agents.ai_lensers al
   JOIN lensers.profiles p ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')),
  4,
  'each family Lenser must have an agents.ai_lensers extension row'
);

-- 8. personality_note is non-empty and carries the family key.
SELECT is(
  (SELECT count(*)::int FROM agents.ai_lensers al
   JOIN lensers.profiles p ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND al.personality_note IS NOT NULL
     AND al.personality_note ILIKE '%"family":"' || upper(p.handle) || '"%'),
  4,
  'each family Lenser personality_note must contain its family key (LENSO/LENSA/LENSE/LOLA)'
);

-- 9. Each family Lenser is owned by @lenserfight.
SELECT is(
  (SELECT count(*)::int FROM agents.ownerships o
   JOIN agents.ai_lensers al ON al.id = o.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND o.owner_lenser_id = 'b2000000-0000-0000-0000-000000000001'::uuid
     AND o.role = 'owner'
     AND o.revoked_at IS NULL),
  4,
  'each family Lenser must have an active owner=@lenserfight ownership row'
);

-- 10. Every family Lenser has an agents.policies row.
SELECT is(
  (SELECT count(*)::int FROM agents.policies pol
   JOIN agents.ai_lensers al ON al.id = pol.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')),
  4,
  'each family Lenser must have an agents.policies row'
);

-- 11. is_public_policy = true for all four.
SELECT is(
  (SELECT count(*)::int FROM agents.policies pol
   JOIN agents.ai_lensers al ON al.id = pol.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND pol.is_public_policy = true),
  4,
  'each family Lenser policy must have is_public_policy=true'
);

-- 12. Battle + vote capabilities are enabled.
SELECT is(
  (SELECT count(*)::int FROM agents.policies pol
   JOIN agents.ai_lensers al ON al.id = pol.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND pol.can_join_battles = true
     AND pol.can_vote = true),
  4,
  'each family Lenser must have can_join_battles=true and can_vote=true'
);

-- 13. No family Lenser may spend credits autonomously.
SELECT is(
  (SELECT count(*)::int FROM agents.policies pol
   JOIN agents.ai_lensers al ON al.id = pol.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND pol.spending_limit_credits = 0),
  4,
  'family Lensers must have spending_limit_credits=0 (no autonomous spend on @lenserfight wallet)'
);

-- 14. LENSO is the only family member that may create battles (orchestrator ceiling).
SELECT is(
  (SELECT array_agg(p.handle ORDER BY p.handle)
   FROM agents.policies pol
   JOIN agents.ai_lensers al ON al.id = pol.ai_lenser_id
   JOIN lensers.profiles p   ON p.id = al.profile_id
   WHERE p.handle IN ('lenso','lensa','lense','lola')
     AND pol.can_create_battles = true),
  ARRAY['lenso']::text[],
  'LENSO must be the only family member with can_create_battles=true (orchestrator ceiling)'
);

SELECT * FROM finish();
ROLLBACK;
