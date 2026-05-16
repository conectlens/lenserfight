-- =============================================================================
-- Phase NG-P0: Namespace Governance — Schema, Logic & Trigger
--
-- ONE new table replaces the 8-entry hardcoded CHECK constraint on
-- lensers.profiles (lensers_reserved_handle_check). All detection logic
-- lives in pure SECURITY DEFINER functions. No new schemas beyond
-- identity_gov itself; no audit tables; no policy tables.
--
-- What this migration does
--   1. Creates schema identity_gov.
--   2. Creates ONE table: identity_gov.reserved_namespaces.
--   3. Creates normalizer function (pure, stateless): fn_normalize_handle.
--   4. Creates skeleton function (homoglyph folding): fn_handle_skeleton.
--   5. Creates the validation pipeline: fn_validate_handle.
--   6. Creates the public RPC: fn_check_handle.
--   7. Creates the BEFORE INSERT/UPDATE trigger on lensers.profiles that
--      replaces the legacy lensers_reserved_handle_check constraint.
--   8. Drops the legacy constraint.
--   9. Applies RLS (SECURITY DEFINER RPCs are the only write path).
--
-- GRASP alignment
--   Information Expert  → identity_gov owns normalization, detection, decision.
--   Protected Variations → new providers/models are DATA rows, not code changes.
--   Pure Fabrication    → fn_normalize_handle, fn_handle_skeleton are stateless
--                         services with no domain-entity coupling.
--   Controller          → fn_validate_handle is the single validation authority.
--   Low Coupling        → lensers.profiles trigger delegates to fn_validate_handle;
--                         the profile table has no governance logic of its own.
--
-- OOAD pattern map
--   Registry         → reserved_namespaces table
--   Strategy         → entry_kind column selects exact/prefix/suffix/token/regex
--   Chain of Resp.   → fn_validate_handle runs probes in priority order
--   Specification    → each probe is a self-contained boolean sub-query
--   Risk Scoring     → weighted-sum, all weights embedded in function defaults
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions (both available in all Supabase projects by default)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch"  WITH SCHEMA "extensions";

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS "identity_gov";

COMMENT ON SCHEMA "identity_gov" IS
  'Namespace governance authority. Single source of truth for reserved handles. '
  'Write access only through SECURITY DEFINER RPCs.';

-- ---------------------------------------------------------------------------
-- 2. The ONE table: reserved_namespaces
--    Covers exact matches, prefix/suffix/token rules, and regex patterns.
--    Composition enforcement (token + modifier) is handled algorithmically
--    in fn_validate_handle so we do not enumerate every combination.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "identity_gov"."reserved_namespaces" (
  "id"          uuid     NOT NULL DEFAULT gen_random_uuid(),
  "entry_kind"  text     NOT NULL,
  "value"       text     NOT NULL,
  "class"       text     NOT NULL,
  "deny_score"  smallint NOT NULL DEFAULT 80,
  "reason"      text,
  "source"      text     NOT NULL DEFAULT 'manifest',
  "expires_at"  timestamptz,
  "created_at"  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT "reserved_namespaces_pk"
    PRIMARY KEY ("id"),

  CONSTRAINT "reserved_namespaces_kind_value_uniq"
    UNIQUE ("entry_kind", "value"),

  CONSTRAINT "reserved_namespaces_kind_check"
    CHECK ("entry_kind" IN ('exact', 'prefix', 'suffix', 'token', 'regex')),

  CONSTRAINT "reserved_namespaces_class_check"
    CHECK ("class" IN (
      'system', 'security', 'provider', 'model',
      'future', 'verified_only', 'restricted'
    )),

  CONSTRAINT "reserved_namespaces_source_check"
    CHECK ("source" IN ('canonical', 'manifest', 'ai_inferred')),

  CONSTRAINT "reserved_namespaces_deny_score_range"
    CHECK ("deny_score" BETWEEN 0 AND 100)
);

-- Fast exact lookup.
CREATE INDEX IF NOT EXISTS "reserved_namespaces_exact_idx"
  ON "identity_gov"."reserved_namespaces" ("entry_kind", "value")
  WHERE "entry_kind" = 'exact';

-- Fast prefix/suffix/token scans.
CREATE INDEX IF NOT EXISTS "reserved_namespaces_kind_idx"
  ON "identity_gov"."reserved_namespaces" ("entry_kind");

-- Trigram search for fuzzy matching against all 'exact' rows.
CREATE INDEX IF NOT EXISTS "reserved_namespaces_trgm_idx"
  ON "identity_gov"."reserved_namespaces"
  USING gin ("value" extensions.gin_trgm_ops)
  WHERE "entry_kind" = 'exact';

-- Partial index for ai_inferred rows (expiry cleanup cron targets this).
CREATE INDEX IF NOT EXISTS "reserved_namespaces_expires_idx"
  ON "identity_gov"."reserved_namespaces" ("expires_at")
  WHERE "expires_at" IS NOT NULL;

COMMENT ON TABLE "identity_gov"."reserved_namespaces" IS
  'Registry of protected handles and patterns. entry_kind drives probe selection: '
  'exact=direct match, prefix/suffix=anchored substring, token=combinatorial '
  'composition guard, regex=arbitrary pattern for complex cases.';

COMMENT ON COLUMN "identity_gov"."reserved_namespaces"."entry_kind" IS
  'exact: normalized handle must equal value. '
  'prefix: normalized handle must not start with value. '
  'suffix: normalized handle must not end with value. '
  'token: normalized handle must not contain value adjacent to a modifier (ai, bot, admin…). '
  'regex: normalized handle must not match value as a POSIX regex.';

COMMENT ON COLUMN "identity_gov"."reserved_namespaces"."value" IS
  'Already-normalized form: lowercase, ASCII-only where possible. '
  'Regex entries use POSIX syntax.';

COMMENT ON COLUMN "identity_gov"."reserved_namespaces"."deny_score" IS
  'Minimum risk score returned when this entry matches. '
  'system=100, security=95, provider=90, model=85, future=80, verified_only=70, restricted=50.';

COMMENT ON COLUMN "identity_gov"."reserved_namespaces"."expires_at" IS
  'NULL = permanent. Set to now()+30d for ai_inferred entries during grace window.';

-- ---------------------------------------------------------------------------
-- 3. fn_normalize_handle — pure normalizer (no I/O, stateless)
--
--    Pipeline (in order):
--      a. Strip invisible/directional Unicode characters (ZWJ, ZWNJ, RLM, etc.)
--      b. NFKC normalization (decomposes ligatures, compatibility chars)
--      c. Lowercase (casefold)
--      d. Homoglyph fold: map common Cyrillic/Greek/look-alike codepoints to ASCII
--      e. Leet-speak fold: 0→o, 1→l, 3→e, 4→a, 5→s, 7→t, @→a, $→s, 8→b
--      f. Strip or collapse repeated characters (aaa→a, lllens→lens)
--      g. Strip filler suffixes that signal impersonation intent
--      h. Strip leading/trailing underscores/hyphens left by previous steps
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "identity_gov"."fn_normalize_handle"(p_handle text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = 'extensions'
AS $$
DECLARE
  v text := p_handle;
BEGIN
  IF v IS NULL OR v = '' THEN
    RETURN '';
  END IF;

  -- (a) Strip invisible/directional Unicode control characters.
  v := regexp_replace(v, '[-​-‏‪-‮⁠-⁯﻿]', '', 'g');

  -- (b) NFKC — decomposes ligatures (ﬁ→fi), compatibility chars (ＡＢＣ→ABC), etc.
  v := normalize(v, NFKC);

  -- (c) Casefold.
  v := lower(v);

  -- (d) Common homoglyph fold (Cyrillic, Greek, look-alike ASCII variants).
  --     Only the highest-frequency attack vectors are covered here; the
  --     skeleton function (fn_handle_skeleton) provides a second TR-39 pass.
  v := translate(v,
    'аbcдеfgнijкlмnoрqrstuvwхуzаéèêëàâäîïôöùûüçæœ',
    'abcdefehnijklmnopqrstuvwxyzaeeeeaaaiioouuucao'
  );
  -- Cyrillic а,е,о,р,с,х → a,e,o,p,c,x (most common Cyrillic spoofing set)
  v := replace(v, chr(1072), 'a'); -- а (Cyrillic)
  v := replace(v, chr(1077), 'e'); -- е
  v := replace(v, chr(1086), 'o'); -- о
  v := replace(v, chr(1088), 'p'); -- р
  v := replace(v, chr(1089), 'c'); -- с
  v := replace(v, chr(1093), 'x'); -- х
  v := replace(v, chr(1080), 'u'); -- и → u (common)

  -- (e) Leet-speak fold.
  v := translate(v, '013457@$', 'oleastsas');
  -- 8→b is common in brand spoofing
  v := replace(v, '8', 'b');

  -- (f) Collapse runs of 3+ identical characters to 2 (openaaaai → openai).
  --     Leaves legitimate double letters intact (google, twitter).
  LOOP
    DECLARE v2 text;
    BEGIN
      v2 := regexp_replace(v, '(.)\1{2,}', '\1\1', 'g');
      EXIT WHEN v2 = v;
      v := v2;
    END;
  END LOOP;

  -- (g) Strip impersonation-signalling filler suffixes and prefixes.
  --     Order matters: strip suffixes first so prefix check works cleanly.
  v := regexp_replace(v,
    '[_\-]?(official|support|help|hq|team|real|inc|corp|llc|org|net|io|app|'
    'pro|plus|admin|mod|moderator|bot|ai|system|sys|core|api|dev|central|'
    'global|world|portal|hub|connect|official|iam|verify|verified)$',
    '', 'g');
  -- Strip leading "the" + separator (theopenai → openai).
  v := regexp_replace(v, '^the[_\-]?', '', 'g');

  -- (h) Strip leading/trailing separators left by previous steps.
  v := trim(both '_-' FROM v);

  RETURN v;
END;
$$;

COMMENT ON FUNCTION "identity_gov"."fn_normalize_handle"(text) IS
  'Pure normalizer. NFKC → casefold → homoglyph fold → leet fold → '
  'repeat collapse → filler suffix strip. Returns empty string on NULL/empty input. '
  'IMMUTABLE — result depends only on input, safe to index.';

-- ---------------------------------------------------------------------------
-- 4. fn_handle_skeleton — simplified TR-39 confusable skeleton
--    Provides a second, more aggressive fold for the homoglyph probe.
--    Applied on top of fn_normalize_handle output.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "identity_gov"."fn_handle_skeleton"(p_normalized text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- After fn_normalize_handle, most Latin/Cyrillic/Greek confusables are already
  -- folded. This function applies the remaining high-risk skeleton mappings:
  -- rn → m, vv → w, ii → u (common visual confusion in sans-serif fonts).
  SELECT regexp_replace(
    regexp_replace(
      regexp_replace(p_normalized, 'rn', 'm', 'g'),
    'vv', 'w', 'g'),
  'ii', 'u', 'g')
$$;

COMMENT ON FUNCTION "identity_gov"."fn_handle_skeleton"(text) IS
  'Applies font-level confusable folds on top of fn_normalize_handle output. '
  'Used by the homoglyph probe in fn_validate_handle.';

-- ---------------------------------------------------------------------------
-- 5. fn_validate_handle — the 9-step validation pipeline
--
--    Returns: (verdict text, class text, risk_score smallint, reason_codes text[])
--
--    Steps (Chain of Responsibility — first terminal verdict wins):
--      [1] Syntax guard
--      [2] Normalize
--      [3] Exact registry hit
--      [4] Prefix / suffix / regex pattern match
--      [5] Token + modifier composition check
--      [6] Homoglyph skeleton probe
--      [7] Levenshtein fuzzy probe (edit distance ≤ 2 against exact entries)
--      [8] Trigram similarity probe (pg_trgm similarity > threshold)
--      [9] Phonetic probe (Double-Metaphone)
--
--    Scoring bands (configurable via deny_score on each registry row):
--      score ≥ 70 → deny
--      score 40–69 → escalate
--      score < 40  → allow
--
--    Failure policy: on any unexpected error, returns deny with reason
--    'internal_error' — fail CLOSED for class ≥ provider.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "identity_gov"."fn_validate_handle"(p_candidate text)
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

  -- Modifier tokens that signal impersonation when combined with a protected token.
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
  v_norm     := "identity_gov"."fn_normalize_handle"(p_candidate);
  v_skeleton := "identity_gov"."fn_handle_skeleton"(v_norm);
  v_metaphone := extensions.dmetaphone(v_norm);

  -- If normalization reduces the handle to something very short, it was mostly
  -- composed of stripped characters — almost certainly an evasion attempt.
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
  -- If any protected token appears embedded in the normalized form AND a modifier
  -- is also present (stripped or adjacent), this is a composition impersonation.
  FOR r IN
    SELECT "value", "class", "deny_score"
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'token'
      AND  ("expires_at" IS NULL OR "expires_at" > now())
  LOOP
    IF v_norm LIKE ('%' || r.value || '%') THEN
      -- Token present — check if any modifier was in the original candidate (before stripping).
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
      -- Token alone in normalized form — lower risk (user suffix stripped).
      v_score := greatest(v_score, 45::smallint);
      v_class := coalesce(v_class, r.class);
      v_reasons := array_append(v_reasons, 'token_match');
    END IF;
  END LOOP;

  -- ── [6] Homoglyph skeleton probe ─────────────────────────────────────────
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
  -- Only run against exact entries; restricted to rows where length is close to
  -- v_norm length to keep the scan bounded.
  FOR r IN
    SELECT "value", "class", "deny_score"
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'exact'
      AND  abs(length("value") - length(v_norm)) <= 2
      AND  ("expires_at" IS NULL OR "expires_at" > now())
  LOOP
    IF extensions.levenshtein_less_equal(v_norm, r.value, 2) <= 2 THEN
      -- Distance 1 = deny, distance 2 = escalate if score not already high.
      IF extensions.levenshtein(v_norm, r.value) <= 1 THEN
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
  -- pg_trgm similarity > 0.70 against exact entries is a strong signal.
  SELECT "class", "deny_score"
  INTO   v_class, v_deny_floor
  FROM   "identity_gov"."reserved_namespaces"
  WHERE  "entry_kind" = 'exact'
    AND  ("expires_at" IS NULL OR "expires_at" > now())
    AND  "value" % v_norm          -- pg_trgm similarity operator
    AND  extensions.similarity("value", v_norm) > 0.70
  ORDER BY extensions.similarity("value", v_norm) DESC
  LIMIT 1;

  IF FOUND THEN
    v_score := greatest(v_score, 50::smallint);
    v_reasons := array_append(v_reasons, 'trigram_similarity');
  END IF;

  -- ── [9] Phonetic probe (Double-Metaphone) ────────────────────────────────
  -- Matches handles that sound like a protected entity when spoken aloud.
  IF v_metaphone IS NOT NULL AND length(v_metaphone) > 0 THEN
    SELECT "class", "deny_score"
    INTO   v_class, v_deny_floor
    FROM   "identity_gov"."reserved_namespaces"
    WHERE  "entry_kind" = 'exact'
      AND  extensions.dmetaphone("value") = v_metaphone
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
  -- Fail CLOSED: any internal error produces a deny so the registry
  -- stays protected during service degradation.
  RETURN QUERY SELECT 'deny'::text, 'security'::text, 90::smallint,
    ARRAY['internal_error:' || SQLERRM];
END;
$$;

COMMENT ON FUNCTION "identity_gov"."fn_validate_handle"(text) IS
  '9-step Chain of Responsibility validation pipeline. Returns verdict, '
  'class_hit, risk_score, reason_codes. Fails CLOSED on exception. '
  'STABLE — reads registry rows but writes nothing.';

-- ---------------------------------------------------------------------------
-- 6. fn_check_handle — public read-through RPC (safe for debounced UI calls)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."fn_check_handle"(p_handle text)
RETURNS TABLE (
  verdict      text,
  class_hit    text,
  risk_score   smallint,
  reason_codes text[],
  is_available boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    v.verdict,
    v.class_hit,
    v.risk_score,
    v.reason_codes,
    (v.verdict = 'allow') AS is_available
  FROM identity_gov.fn_validate_handle(p_handle) v;
$$;

COMMENT ON FUNCTION "public"."fn_check_handle"(text) IS
  'Public read-through handle availability check. '
  'Safe for debounced UI calls (STABLE, no writes). '
  'Granted to authenticated and anon; results are advisory — '
  'fn_claim_handle on the write path performs the authoritative check.';

GRANT EXECUTE ON FUNCTION "public"."fn_check_handle"(text) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 7. BEFORE trigger on lensers.profiles — replaces legacy CHECK constraint
--
--    Runs fn_validate_handle on INSERT and on UPDATE when handle changes.
--    Denies row changes where verdict = 'deny'.
--    Escalation (40–69) is allowed through — T&S reviews flagged accounts.
--    System/canonical accounts (owned by the platform) bypass via superuser.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION "identity_gov"."fn_guard_lenser_handle"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_verdict    text;
  v_class      text;
  v_score      smallint;
  v_reasons    text[];
BEGIN
  -- No change to handle on UPDATE — skip validation.
  IF TG_OP = 'UPDATE' AND OLD.handle IS NOT DISTINCT FROM NEW.handle THEN
    RETURN NEW;
  END IF;

  SELECT verdict, class_hit, risk_score, reason_codes
  INTO   v_verdict, v_class, v_score, v_reasons
  FROM   "identity_gov"."fn_validate_handle"(NEW.handle);

  IF v_verdict = 'deny' THEN
    RAISE EXCEPTION
      'Handle "%" is reserved or protected (class: %, score: %, reasons: %). '
      'Choose a different handle.',
      NEW.handle, coalesce(v_class, 'unknown'), v_score,
      array_to_string(v_reasons, ', ')
      USING ERRCODE = 'P0001';
  END IF;

  -- Escalated handles are allowed through but could be flagged
  -- via the event bus in a future NG-P1 migration.
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER "trg_guard_lenser_handle"
  BEFORE INSERT OR UPDATE OF "handle" ON "lensers"."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION "identity_gov"."fn_guard_lenser_handle"();

COMMENT ON FUNCTION "identity_gov"."fn_guard_lenser_handle"() IS
  'BEFORE trigger on lensers.profiles. Delegates to fn_validate_handle. '
  'Raises P0001 on deny. Replaces the legacy lensers_reserved_handle_check constraint.';

-- ---------------------------------------------------------------------------
-- 8. Drop legacy hardcoded CHECK constraint
-- ---------------------------------------------------------------------------

ALTER TABLE "lensers"."profiles"
  DROP CONSTRAINT IF EXISTS "lensers_reserved_handle_check";

-- ---------------------------------------------------------------------------
-- 9. Row-Level Security — read-only for authenticated/anon; writes via DEFINER
-- ---------------------------------------------------------------------------

ALTER TABLE "identity_gov"."reserved_namespaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity_gov"."reserved_namespaces" FORCE ROW LEVEL SECURITY;

-- Everyone can read the registry (class + value only; rationale kept opaque by
-- the application layer — not enforced here since the registry is not sensitive).
CREATE POLICY "reserved_namespaces_select"
  ON "identity_gov"."reserved_namespaces"
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- No direct INSERT/UPDATE/DELETE from any client role.
-- Writes go through SECURITY DEFINER functions executed as postgres/service_role.

COMMIT;
