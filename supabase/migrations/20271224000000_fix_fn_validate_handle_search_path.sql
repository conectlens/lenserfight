-- Fix: fn_validate_handle fails with "operator does not exist: text % text"
--
-- Root cause: migration 20271221000000_identity_gov_perf_indexes recreated
-- fn_validate_handle with SET search_path = '', which drops 'extensions' from
-- the search path. The pg_trgm '%' operator lives in the 'extensions' schema
-- in Supabase and is resolved via search_path at runtime — it cannot be
-- schema-qualified in SQL syntax (unlike functions). So with an empty
-- search_path the operator lookup fails at step 8 (trigram similarity probe),
-- and the EXCEPTION handler catches it and returns the opaque 'internal_error'.
--
-- Fix: CREATE OR REPLACE with search_path = 'identity_gov, extensions,
-- pg_catalog'. This supersedes the plain ALTER in earlier migration
-- 20271219000004 and is self-contained for databases in any migration state.
--
-- The function body is identical to 20271221000000 — only the search_path
-- directive changes.

CREATE OR REPLACE FUNCTION "identity_gov"."fn_validate_handle"("p_candidate" text)
RETURNS TABLE (
  verdict      text,
  class_hit    text,
  risk_score   smallint,
  reason_codes text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO identity_gov, extensions, pg_catalog
AS $$
DECLARE
  v_norm        text;
  v_skeleton    text;
  v_metaphone   text;
  v_score       smallint := 0;
  v_class       text     := null;
  v_reasons     text[]   := '{}';
  v_deny_floor  smallint;

  v_modifiers   text[] := ARRAY[
    'ai','bot','official','admin','mod','moderator','support','help',
    'hq','team','real','inc','corp','llc','sys','system','core','api',
    'dev','io','app','pro','plus','central','global','hub','connect',
    'verify','verified','iam','portal','world','gpt','llm'
  ];
  r             record;
BEGIN
  -- ── [1] Syntax guard ────────────────────────────────────────────────────
  IF p_candidate IS NULL OR length(trim(p_candidate)) < 3 THEN
    RETURN QUERY SELECT 'deny'::text, 'system'::text, 100::smallint, ARRAY['syntax_too_short'];
    RETURN;
  END IF;
  IF length(p_candidate) > 30 THEN
    RETURN QUERY SELECT 'deny'::text, 'system'::text, 100::smallint, ARRAY['syntax_too_long'];
    RETURN;
  END IF;
  IF p_candidate !~ '^[a-zA-Z0-9_\-]+$' THEN
    RETURN QUERY SELECT 'deny'::text, 'system'::text, 100::smallint, ARRAY['syntax_invalid_chars'];
    RETURN;
  END IF;

  -- ── [2] Normalize ───────────────────────────────────────────────────────
  v_norm      := "identity_gov"."fn_normalize_handle"(p_candidate);
  v_skeleton  := "identity_gov"."fn_handle_skeleton"(v_norm);
  v_metaphone := "extensions"."dmetaphone"(v_norm);

  IF length(v_norm) < 2 THEN
    RETURN QUERY SELECT 'deny'::text, 'security'::text, 95::smallint, ARRAY['evasion_normalized_too_short'];
    RETURN;
  END IF;

  -- ── [3] Exact registry hit ──────────────────────────────────────────────
  SELECT "deny_score", "class"
  INTO   v_deny_floor, v_class
  FROM   "identity_gov"."reserved_namespaces"
  WHERE  "entry_kind" = 'exact'
    AND  "value"      = v_norm
    AND  ("expires_at" IS NULL OR "expires_at" > now())
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 'deny'::text, v_class, v_deny_floor, ARRAY['exact_match'];
    RETURN;
  END IF;

  -- ── [4] Prefix / suffix / regex pattern match ───────────────────────────
  FOR r IN
    SELECT "entry_kind", "value", "class", "deny_score"
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" IN ('prefix', 'suffix', 'regex')
      AND  ("expires_at" IS NULL OR "expires_at" > now())
  LOOP
    IF r.entry_kind = 'prefix' AND left(v_norm, length(r.value)) = r.value THEN
      RETURN QUERY SELECT 'deny'::text, r.class, r.deny_score, ARRAY['prefix_match'];
      RETURN;
    END IF;
    IF r.entry_kind = 'suffix' AND right(v_norm, length(r.value)) = r.value THEN
      v_score := greatest(v_score, 60::smallint);
      v_class := coalesce(v_class, r.class);
      v_reasons := array_append(v_reasons, 'suffix_match');
    END IF;
    IF r.entry_kind = 'regex' AND v_norm ~ r.value THEN
      RETURN QUERY SELECT 'deny'::text, r.class, r.deny_score, ARRAY['regex_match'];
      RETURN;
    END IF;
  END LOOP;

  -- ── [5] Token + modifier composition check ──────────────────────────────
  FOR r IN
    SELECT "value", "class", "deny_score"
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'token'
      AND  ("expires_at" IS NULL OR "expires_at" > now())
  LOOP
    IF v_norm LIKE ('%' || r.value || '%') THEN
      IF EXISTS (
        SELECT 1
        FROM   unnest(v_modifiers) AS m(mod)
        WHERE  lower(p_candidate) LIKE ('%' || m.mod || '%')
           OR  lower(p_candidate) LIKE (m.mod || '%')
           OR  lower(p_candidate) LIKE ('%' || m.mod)
      ) THEN
        RETURN QUERY SELECT 'deny'::text, r.class, r.deny_score, ARRAY['composition_token_modifier'];
        RETURN;
      END IF;
      v_score := greatest(v_score, 45::smallint);
      v_class := coalesce(v_class, r.class);
      v_reasons := array_append(v_reasons, 'token_match');
    END IF;
  END LOOP;

  -- ── [6] Homoglyph skeleton probe ─────────────────────────────────────────
  -- Uses reserved_namespaces_skeleton_idx (btree on fn_handle_skeleton(value)).
  SELECT "deny_score", "class"
  INTO   v_deny_floor, r.class
  FROM   "identity_gov"."reserved_namespaces"
  WHERE  "entry_kind" = 'exact'
    AND  "identity_gov"."fn_handle_skeleton"("value") = v_skeleton
    AND  ("expires_at" IS NULL OR "expires_at" > now())
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT 'deny'::text, r.class, v_deny_floor, ARRAY['homoglyph_skeleton'];
    RETURN;
  END IF;

  -- ── [7] Levenshtein fuzzy probe (edit distance ≤ 2) ──────────────────────
  -- BETWEEN lets the planner use reserved_namespaces_exact_len_idx for a range
  -- seek, skipping rows whose length differs by more than 2 from the candidate.
  FOR r IN
    SELECT "value", "class", "deny_score"
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'exact'
      AND  length("value") BETWEEN length(v_norm) - 2 AND length(v_norm) + 2
      AND  ("expires_at" IS NULL OR "expires_at" > now())
  LOOP
    IF "extensions"."levenshtein_less_equal"(v_norm, r.value, 2) <= 2 THEN
      IF "extensions"."levenshtein"(v_norm, r.value) <= 1 THEN
        RETURN QUERY SELECT 'deny'::text, r.class, r.deny_score, ARRAY['levenshtein_distance_1'];
        RETURN;
      ELSE
        v_score := greatest(v_score, 55::smallint);
        v_class := coalesce(v_class, r.class);
        v_reasons := array_append(v_reasons, 'levenshtein_distance_2');
      END IF;
    END IF;
  END LOOP;

  -- ── [8] Trigram similarity probe ─────────────────────────────────────────
  -- Uses reserved_namespaces_trgm_idx (GIN gin_trgm_ops WHERE entry_kind='exact').
  -- The '%' operator and extensions.similarity() both live in the extensions
  -- schema; they resolve correctly only when 'extensions' is in search_path.
  SELECT "class", "deny_score"
  INTO   v_class, v_deny_floor
  FROM   "identity_gov"."reserved_namespaces"
  WHERE  "entry_kind" = 'exact'
    AND  ("expires_at" IS NULL OR "expires_at" > now())
    AND  "value" % v_norm
    AND  "extensions"."similarity"("value", v_norm) > 0.70
  ORDER BY "extensions"."similarity"("value", v_norm) DESC
  LIMIT 1;

  IF FOUND THEN
    v_score := greatest(v_score, 50::smallint);
    v_reasons := array_append(v_reasons, 'trigram_similarity');
  END IF;

  -- ── [9] Phonetic probe (Double-Metaphone) ────────────────────────────────
  -- Uses reserved_namespaces_metaphone_idx (btree on dmetaphone(value)).
  IF v_metaphone IS NOT NULL AND length(v_metaphone) > 0 THEN
    SELECT "class", "deny_score"
    INTO   v_class, v_deny_floor
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'exact'
      AND  "extensions"."dmetaphone"("value") = v_metaphone
      AND  ("expires_at" IS NULL OR "expires_at" > now())
    LIMIT 1;

    IF FOUND THEN
      v_score := greatest(v_score, 40::smallint);
      v_reasons := array_append(v_reasons, 'phonetic_match');
    END IF;
  END IF;

  -- ── Final verdict ────────────────────────────────────────────────────────
  IF v_score >= 70 THEN
    RETURN QUERY SELECT 'deny'::text, v_class, v_score, v_reasons;
  ELSIF v_score >= 40 THEN
    RETURN QUERY SELECT 'escalate'::text, v_class, v_score, v_reasons;
  ELSE
    RETURN QUERY SELECT 'allow'::text, null::text, v_score, v_reasons;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 'deny'::text, 'security'::text, 90::smallint,
    ARRAY['internal_error:' || SQLERRM];
END;
$$;

COMMENT ON FUNCTION "identity_gov"."fn_validate_handle"(text) IS
  '9-step Chain of Responsibility validation pipeline. Returns verdict, '
  'class_hit, risk_score, reason_codes. Fails CLOSED on exception. '
  'STABLE — reads registry rows but writes nothing. '
  'Step 7 uses BETWEEN (not abs) so reserved_namespaces_exact_len_idx is usable.';
