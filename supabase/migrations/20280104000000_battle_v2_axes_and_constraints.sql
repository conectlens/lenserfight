-- ─────────────────────────────────────────────────────────────────────────────
-- Battle V2 axes storage + task-source/contender enforcement
--
-- Stores the three V2 battle-creation axes (task_source, contender_structure,
-- judging_mode) on battles.battles so they can be queried, audited, and
-- validated server-side.
--
-- Also adds a CHECK constraint that enforces the single source of truth rule:
--   Lens and Workflow battles are AI-only execution contracts.
--   Human contender types (human_vs_ai, human_vs_human_*) are only valid
--   when task_source = 'challenge'.
--
-- Mirrors the domain rule in:
--   libs/domain/battle-governance/src/lib/contender-structure.types.ts
--   CONTENDER_BY_TASK_SOURCE → { lens: ['ai_vs_ai'], workflow: ['ai_vs_ai'] }
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add V2 axis columns (nullable so existing rows pass without backfill)
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS task_source TEXT
    CHECK (task_source IS NULL OR task_source IN ('lens', 'workflow', 'challenge')),
  ADD COLUMN IF NOT EXISTS contender_structure TEXT
    CHECK (contender_structure IS NULL OR contender_structure IN ('ai_vs_ai', 'human_vs_ai', 'human_vs_human')),
  ADD COLUMN IF NOT EXISTS judging_mode TEXT
    CHECK (judging_mode IS NULL OR judging_mode IN ('community_vote', 'ai_judge', 'rubric_score', 'auto_score'));

-- 2. Enforce: when task_source is 'lens' or 'workflow', only AI-safe
--    battle_type values are permitted.
--
--    The constraint is intentionally lenient for NULL task_source (legacy rows
--    created before V2 schema rollout). New rows written by the wizard always
--    include task_source and will be fully validated.
--
--    'lenser_battle' is allowed because it resolves to a lens-based AI pipeline
--    with a policy overlay (no human contenders).
ALTER TABLE battles.battles
  ADD CONSTRAINT chk_task_source_battle_type_compat CHECK (
    task_source IS NULL
    OR task_source = 'challenge'
    OR (
      task_source IN ('lens', 'workflow')
      AND battle_type IN ('ai_vs_ai', 'workflow_battle', 'lenser_battle')
    )
  );

-- 3. Index: common filter pattern for discovery / analytics queries
CREATE INDEX IF NOT EXISTS idx_battles_task_source
  ON battles.battles (task_source)
  WHERE task_source IS NOT NULL;

COMMENT ON COLUMN battles.battles.task_source IS
  'V2 axis: the execution contract that defines the battle — lens, workflow, or challenge. '
  'Lens and workflow task sources are AI-only; human contenders are only valid for challenge.';

COMMENT ON COLUMN battles.battles.contender_structure IS
  'V2 axis: who competes — ai_vs_ai, human_vs_ai, or human_vs_human. '
  'For lens/workflow task sources this is always ai_vs_ai (enforced by chk_task_source_battle_type_compat).';

COMMENT ON COLUMN battles.battles.judging_mode IS
  'V2 axis: how the winner is decided — community_vote, ai_judge, rubric_score, or auto_score.';
