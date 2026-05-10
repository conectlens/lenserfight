-- =============================================================================
-- CI Guard — raises if real API keys are found in execution.byok_keys
-- This seed must run AFTER all schema seeds but BEFORE any data seeds.
-- =============================================================================

DO $$
DECLARE
  v_env TEXT;
  v_real_key_count INT;
BEGIN
  -- Only enforce in CI environment
  v_env := current_setting('app.environment', true);
  IF v_env IS DISTINCT FROM 'ci' THEN
    RETURN;
  END IF;

  -- Detect patterns that look like real API keys:
  -- OpenAI: sk-...  Anthropic: sk-ant-...  Google: ya29.* or AIza...
  SELECT count(*) INTO v_real_key_count
  FROM execution.byok_keys
  WHERE key_encrypted ~* '^(sk-|sk-ant-|ya29\.|AIza|Bearer )'
     OR length(key_encrypted) > 64;  -- real keys are long; test placeholders are short

  IF v_real_key_count > 0 THEN
    RAISE EXCEPTION
      'CI_GUARD: % real API key(s) detected in execution.byok_keys. '
      'Use placeholder values in CI seeds.', v_real_key_count
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;
