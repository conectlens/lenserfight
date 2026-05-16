-- ============================================================================
-- Battle Lenser Type + Policy Migration
-- ============================================================================
-- Adds:
-- 1. 'lenser_battle' to battles.battle_type_enum (was in frontend only)
-- 2. shared_input_snapshot JSONB column for Lens Battle parameter fairness
-- 3. lenser_battle_policy JSONB column for Lenser Battle memory/instruction rules
-- 4. CHECK constraint on lenser_battle_policy shape
-- ============================================================================

-- 1. Add missing enum value ─────────────────────────────────────────────────
-- ALTER TYPE ... ADD VALUE is append-only and non-destructive.
-- IF NOT EXISTS prevents failure on re-run.
ALTER TYPE battles.battle_type_enum ADD VALUE IF NOT EXISTS 'lenser_battle';

-- 2. Shared input snapshot ──────────────────────────────────────────────────
-- Stores the resolved Lens [[parameter]] values that ALL contenders receive.
-- Immutable after battle creation — ensures fairness.
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS shared_input_snapshot jsonb DEFAULT NULL;

COMMENT ON COLUMN battles.battles.shared_input_snapshot IS
  'Immutable snapshot of shared Lens [[parameter]] values resolved at battle creation time. All contenders receive these identical inputs.';

-- 3. Lenser Battle policy ───────────────────────────────────────────────────
-- Controls memory mode, instruction disclosure, and model binding override
-- for Lenser Battles where contenders bring their own AI identity.
ALTER TABLE battles.battles
  ADD COLUMN IF NOT EXISTS lenser_battle_policy jsonb DEFAULT NULL;

COMMENT ON COLUMN battles.battles.lenser_battle_policy IS
  'Memory mode, instruction disclosure, and model binding override rules for Lenser Battles. NULL for non-Lenser Battle formats.';

-- 4. CHECK constraint ───────────────────────────────────────────────────────
-- Ensures lenser_battle_policy shape is valid when present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_lenser_battle_policy_format'
  ) THEN
    ALTER TABLE battles.battles
      ADD CONSTRAINT chk_lenser_battle_policy_format
      CHECK (
        lenser_battle_policy IS NULL
        OR (
          lenser_battle_policy->>'memory_mode' IN ('clean_room', 'personality', 'unrestricted')
          AND lenser_battle_policy->>'instruction_disclosure' IN ('hidden', 'visible_after_close', 'always_visible')
        )
      );
  END IF;
END
$$;
