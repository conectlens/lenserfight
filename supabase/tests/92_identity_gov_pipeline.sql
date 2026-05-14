-- =============================================================================
-- pgTAP — Phase NG-P0: Namespace Governance validation pipeline
--
-- Behavioural tests for the 9-step Chain of Responsibility in
-- identity_gov.fn_validate_handle. Each step is exercised with a crafted
-- candidate that only the corresponding probe catches.
--
-- Tests are ROLLBACK-safe — fn_validate_handle and fn_check_handle are STABLE
-- (no writes), so no data is changed.
-- =============================================================================

BEGIN;

SELECT plan(30);

-- Helper: run fn_check_handle and return a single field.
-- Using fn_check_handle (public RPC) exercises the full delegation path.

-- ── NORMALIZER unit tests ─────────────────────────────────────────────────────

-- Leet-speak fold: "0p3n41" normalizes to something near "openai"
SELECT ok(
  identity_gov.fn_normalize_handle('0p3n41') LIKE '%open%'
  OR identity_gov.fn_normalize_handle('0p3n41') LIKE '%opena%',
  'normalizer: leet fold 0p3n41 converges toward openai'
);

-- Repeat collapse: "ooopenai" → "oopenai" (≤2 repeats left)
SELECT ok(
  length(identity_gov.fn_normalize_handle('ooopenai'))
    < length('ooopenai'),
  'normalizer: repeat collapse reduces ooopenai'
);

-- Filler suffix strip: "openaisupport" → normalized removes "support"
SELECT ok(
  identity_gov.fn_normalize_handle('openaisupport') = 'openai',
  'normalizer: filler suffix "support" stripped from openaisupport'
);

-- Filler prefix strip: "theopenai" → "openai"
SELECT ok(
  identity_gov.fn_normalize_handle('theopenai') = 'openai',
  'normalizer: leading "the" stripped from theopenai'
);

-- Invisible char strip: ZWJ-injected handle
SELECT ok(
  identity_gov.fn_normalize_handle(E'open​ai') = 'openai',
  'normalizer: zero-width space stripped from open[ZWJ]ai'
);

-- ── SKELETON unit tests ───────────────────────────────────────────────────────

-- rn → m collision (classic visual spoof in sans-serif)
SELECT ok(
  identity_gov.fn_handle_skeleton('rneta') = 'meta',
  'skeleton: rn→m fold converts rneta to meta'
);

-- ── EXACT PROBE: deny known system handles ────────────────────────────────────
SELECT is(
  (SELECT verdict FROM fn_check_handle('lenserfight')),
  'deny',
  'exact probe: lenserfight → deny (system)'
);

SELECT is(
  (SELECT class_hit FROM fn_check_handle('lenserfight')),
  'system',
  'exact probe: lenserfight class_hit = system'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('openai')),
  'deny',
  'exact probe: openai → deny (provider)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('claude')),
  'deny',
  'exact probe: claude → deny (model)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('admin')),
  'deny',
  'exact probe: admin → deny (security)'
);

-- ── PREFIX PROBE ──────────────────────────────────────────────────────────────
SELECT is(
  (SELECT verdict FROM fn_check_handle('openai-help')),
  'deny',
  'prefix probe: openai-help → deny (openai prefix guard)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('lenserfight-hq')),
  'deny',
  'prefix probe: lenserfight-hq → deny (lenserfight prefix guard)'
);

-- ── COMPOSITION (token + modifier) PROBE ─────────────────────────────────────
SELECT is(
  (SELECT verdict FROM fn_check_handle('lens_ai')),
  'deny',
  'composition probe: lens_ai → deny (lens token + ai modifier)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('gpt-admin')),
  'deny',
  'composition probe: gpt-admin → deny (gpt token + admin modifier)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('claude-bot')),
  'deny',
  'composition probe: claude-bot → deny (claude token + bot modifier)'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('openai-official')),
  'deny',
  'composition probe: openai-official → deny (openai token + official modifier)'
);

-- ── NORMALIZER + EXACT: leet-speak spoof ─────────────────────────────────────
-- "0p3n4i" leet-normalizes to "openai" → exact hit
SELECT is(
  (SELECT verdict FROM fn_check_handle('0p3n4i')),
  'deny',
  'leet spoof 0p3n4i normalizes to openai → deny'
);

-- ── SYNTAX GUARD ─────────────────────────────────────────────────────────────
SELECT is(
  (SELECT verdict FROM fn_check_handle('ab')),
  'deny',
  'syntax guard: handle shorter than 3 chars → deny'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle(repeat('a', 31))),
  'deny',
  'syntax guard: handle longer than 30 chars → deny'
);

-- ── SUFFIX PROBE ─────────────────────────────────────────────────────────────
-- "anything-official" suffix guard fires at score 60 → escalate or deny
SELECT ok(
  (SELECT verdict FROM fn_check_handle('alice-official')) IN ('deny', 'escalate'),
  'suffix probe: alice-official → deny or escalate (-official suffix)'
);

-- ── LEVENSHTEIN PROBE ────────────────────────────────────────────────────────
-- "openaj" — edit distance 1 from "openai"
SELECT ok(
  (SELECT verdict FROM fn_check_handle('openaj')) IN ('deny', 'escalate'),
  'levenshtein probe: openaj (distance 1 from openai) → deny or escalate'
);

-- ── PHONETIC PROBE ───────────────────────────────────────────────────────────
-- "klawd" sounds like "claude" via Double-Metaphone
SELECT ok(
  (SELECT risk_score FROM fn_check_handle('klawd')) > 0,
  'phonetic probe: klawd produces a non-zero risk score (sounds like claude)'
);

-- ── SAFE HANDLES pass ────────────────────────────────────────────────────────
SELECT is(
  (SELECT verdict FROM fn_check_handle('alice42')),
  'allow',
  'safe handle alice42 → allow'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('bob-x')),
  'allow',
  'safe handle bob-x → allow'
);

SELECT is(
  (SELECT verdict FROM fn_check_handle('my-battle-bot')),
  'allow',
  'safe handle my-battle-bot → allow'
);

-- ── TRIGGER ENFORCEMENT: reject reserved handle on INSERT ─────────────────────
-- Insert a throwaway profile row with a reserved handle — must fail.
SELECT throws_ok(
  $$
  INSERT INTO lensers.profiles (id, handle, display_name, type)
  VALUES (gen_random_uuid(), 'openai', 'OpenAI Spoof', 'human')
  $$,
  'P0001',
  NULL,
  'trigger blocks INSERT of reserved handle "openai" on lensers.profiles'
);

SELECT throws_ok(
  $$
  INSERT INTO lensers.profiles (id, handle, display_name, type)
  VALUES (gen_random_uuid(), 'claude_admin', 'Claude Spoof', 'human')
  $$,
  'P0001',
  NULL,
  'trigger blocks INSERT of composition handle "claude_admin" on lensers.profiles'
);

-- ── is_available flag ─────────────────────────────────────────────────────────
SELECT is(
  (SELECT is_available FROM fn_check_handle('openai')),
  false,
  'fn_check_handle: is_available=false for denied handle'
);

SELECT is(
  (SELECT is_available FROM fn_check_handle('alice42')),
  true,
  'fn_check_handle: is_available=true for allowed handle'
);

SELECT * FROM finish();

ROLLBACK;
