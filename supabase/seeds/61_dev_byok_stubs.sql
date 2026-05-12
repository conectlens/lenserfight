-- =============================================================================
-- Seed 61 — CE: Dev BYOK stubs
-- Inserts an echo provider BYOK key for the dev user so `lf byok list` returns
-- a result on first run. Key is a placeholder — no real API calls made.
-- =============================================================================

DO $$
DECLARE
  v_user_id  UUID := '00000000-0000-0000-0000-000000000001';
  v_lenser_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Guard: only run if the dev user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE NOTICE 'Dev user not found — skipping BYOK stub seed (run seed 60 first)';
    RETURN;
  END IF;

  -- Insert echo provider BYOK stub
  INSERT INTO execution.byok_keys (
    owner_lenser_id,
    provider,
    model_id,
    encrypted_api_key,
    key_hint,
    label,
    is_valid,
    last_rotated_at,
    created_at
  ) VALUES (
    v_lenser_id,
    'echo',
    'echo-1',
    'echo-stub-key',       -- not a real encrypted key; echo provider ignores it
    'echo-',
    'Dev echo key (stub)',
    true,
    now(),
    now()
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Dev BYOK stub seed applied for lenser %', v_lenser_id;
END;
$$;
