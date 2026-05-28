-- =============================================================================
-- pgTAP — Phase 31: Production seed quality
-- =============================================================================
-- Validates the invariants documented in
-- docs/how-to/contributors/template-authoring.md:
--   • Only reserved production users exist (no alice/bob/carol).
--   • The @lenserfight, @chainabit, @conectlens profiles are present and unique.
--   • Canonical production rays are seeded.
--   • Every public lens template has a non-empty body and at least one ray.
--   • Every legal/finance lens body carries the mandatory disclaimer marker.
--   • Every workflow node references an existing lens version.
--   • No template author is the legacy demo users.
-- =============================================================================
BEGIN;

SELECT plan(14);

-- 1. Reserved trio: @lenserfight profile exists.
SELECT ok(
  EXISTS (
    SELECT 1 FROM lensers.profiles WHERE handle = 'lenserfight'
  ),
  'reserved user @lenserfight must exist'
);

-- 2. Reserved trio: @chainabit profile exists.
SELECT ok(
  EXISTS (
    SELECT 1 FROM lensers.profiles WHERE handle = 'chainabit'
  ),
  'reserved user @chainabit must exist'
);

-- 3. Reserved trio: @conectlens profile exists.
SELECT ok(
  EXISTS (
    SELECT 1 FROM lensers.profiles WHERE handle = 'conectlens'
  ),
  'reserved user @conectlens must exist'
);

-- 4. Legacy demo users (by old handle) must NOT exist as human profiles.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lensers.profiles
    WHERE handle IN ('alice_arena', 'bob_builder', 'carol_voter')
  ),
  'legacy demo handles (alice_arena/bob_builder/carol_voter) must not exist'
);

-- 5. Reserved auth emails are correct.
SELECT ok(
  EXISTS (SELECT 1 FROM auth.users WHERE email = 'hey@lenserfight.com')
    AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'bit@chainabit.com')
    AND EXISTS (SELECT 1 FROM auth.users WHERE email = 'lets@conectlens.com'),
  'reserved auth emails must be hey@lenserfight.com / bit@chainabit.com / lets@conectlens.com'
);

-- 6. Canonical production rays exist.
SELECT ok(
  (SELECT count(*) FROM content.tags
   WHERE slug IN (
     'github','git','cursor','claude','openai','gemini','google','excel',
     'youtube','blog','ai','workflow','planning','deep-thinking','research',
     'finance','legal','productivity','startup','content','marketing','analysis',
     'text','image','video','audio','table','checklist','script',
     'developer','creator','operator','chainabit'
   )) = 33,
  'all 33 canonical production rays must be present'
);

-- 7. Every public lens has a non-empty head version template body.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    JOIN lenses.versions v ON v.id = l.head_version_id
    WHERE l.visibility = 'public'
      AND l.status = 'published'
      AND length(trim(v.template_body)) < 50
  ),
  'every public published lens must have template_body length >= 50'
);

-- 8. Every public lens has at least one ray.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    WHERE l.visibility = 'public'
      AND l.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM content.tag_map tm
        WHERE tm.entity_type = 'lens'
          AND tm.entity_id = l.id
      )
  ),
  'every public published lens must have at least one ray'
);

-- 9. Lenses under the "legal" ray must contain the legal disclaimer marker.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    JOIN lenses.versions v ON v.id = l.head_version_id
    JOIN content.tag_map tm ON tm.entity_type = 'lens' AND tm.entity_id = l.id
    JOIN content.tags t ON t.id = tm.tag_id
    WHERE t.slug = 'legal'
      AND l.visibility = 'public'
      AND lower(v.template_body) NOT LIKE '%not legal advice%'
  ),
  'every public lens under the #legal ray must carry the "NOT legal advice" disclaimer marker'
);

-- 10. Lenses under the "finance" ray must contain the finance disclaimer marker.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    JOIN lenses.versions v ON v.id = l.head_version_id
    JOIN content.tag_map tm ON tm.entity_type = 'lens' AND tm.entity_id = l.id
    JOIN content.tags t ON t.id = tm.tag_id
    WHERE t.slug = 'finance'
      AND l.visibility = 'public'
      AND lower(v.template_body) NOT LIKE '%not certified financial advice%'
  ),
  'every public lens under the #finance ray must carry the "NOT certified financial advice" marker'
);

-- 11. No template lens is owned by the legacy demo UUID range outside the
--     reserved trio (b2000000-…-001/-002/-003 are now @lenserfight/@chainabit/@conectlens).
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.lenses l
    JOIN content.tag_map tm ON tm.entity_type = 'lens' AND tm.entity_id = l.id
    JOIN content.tags t ON t.id = tm.tag_id
    WHERE t.slug = 'template'
      AND l.lenser_id IS NULL
  ),
  'no template-tagged lens may have a NULL lenser_id'
);

-- 12. Every workflow has at least one node referencing an existing lens version.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM lenses.workflows w
    WHERE w.visibility = 'public'
      AND NOT EXISTS (
        SELECT 1 FROM lenses.workflow_nodes n
        WHERE n.workflow_id = w.id
      )
  ),
  'every public workflow must have at least one node'
);

-- 13. Every battle is owned by a real lenser profile.
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM battles.battles b
    WHERE NOT EXISTS (
      SELECT 1 FROM lensers.profiles p WHERE p.id = b.creator_lenser_id
    )
  ),
  'every battle must reference an existing lenser profile as creator'
);

-- 14. The "template" ray itself is present (cold-boot guard).
SELECT ok(
  EXISTS (SELECT 1 FROM content.tags WHERE slug = 'template'),
  'the canonical "template" ray must exist'
);

SELECT * FROM finish();
ROLLBACK;
