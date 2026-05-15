-- =============================================================================
-- 46. CHAINABIT PRODUCTIVITY LENS TEMPLATES
-- =============================================================================
-- Productivity, content-ops, and developer-automation templates owned by the
-- @chainabit reserved account. These templates demonstrate Chainabit as the
-- "BUILD" half of the ConectLens ecosystem — paired with LenserFight as the
-- "COMPETE" half.
--
-- UUID convention: 46000000-0001-LLLL-0001-… where LLLL = lens index (hex)
-- Idempotent: every block is gated with IF NOT EXISTS.
--
-- Dependencies:
--   • migration 20270812000000_canonical_production_tags.sql (canonical rays)
--   • 03_lenser_profiles.sql                                 (@chainabit)
--   • 15_lens_tools.sql                                      (text/textarea)
-- =============================================================================

DO $seed$
DECLARE
  v_author        uuid;
  v_tool_text     uuid;
  v_tool_textarea uuid;

  v_tag_template     uuid;
  v_tag_chainabit    uuid;
  v_tag_productivity uuid;
  v_tag_planning     uuid;
  v_tag_workflow     uuid;
  v_tag_ai           uuid;
  v_tag_github       uuid;
  v_tag_developer    uuid;
  v_tag_operator     uuid;
  v_tag_content      uuid;
  v_tag_marketing    uuid;
  v_tag_checklist    uuid;
  v_tag_table        uuid;
  v_tag_text         uuid;

  -- Lens 1: Weekly Operating Review
  v_lens_wor   uuid := '46000000-0001-0001-0001-000000000001';
  v_ver_wor    uuid := '46000000-0001-0001-0001-00000000000a';
  v_p_wor_a    uuid := '46000000-0001-0001-0001-0000000000a1';
  v_p_wor_b    uuid := '46000000-0001-0001-0001-0000000000a2';

  -- Lens 2: Async Standup Generator
  v_lens_stand uuid := '46000000-0001-0002-0001-000000000001';
  v_ver_stand  uuid := '46000000-0001-0002-0001-00000000000a';
  v_p_st_a     uuid := '46000000-0001-0002-0001-0000000000a1';
  v_p_st_b     uuid := '46000000-0001-0002-0001-0000000000a2';

  -- Lens 3: PR Triage Brief
  v_lens_prtr  uuid := '46000000-0001-0003-0001-000000000001';
  v_ver_prtr   uuid := '46000000-0001-0003-0001-00000000000a';
  v_p_pr_a     uuid := '46000000-0001-0003-0001-0000000000a1';
  v_p_pr_b     uuid := '46000000-0001-0003-0001-0000000000a2';

  -- Lens 4: Launch Content Kit
  v_lens_kit   uuid := '46000000-0001-0004-0001-000000000001';
  v_ver_kit    uuid := '46000000-0001-0004-0001-00000000000a';
  v_p_kit_a    uuid := '46000000-0001-0004-0001-0000000000a1';
  v_p_kit_b    uuid := '46000000-0001-0004-0001-0000000000a2';

  -- Lens 5: Hiring Loop Designer
  v_lens_hire  uuid := '46000000-0001-0005-0001-000000000001';
  v_ver_hire   uuid := '46000000-0001-0005-0001-00000000000a';
  v_p_hr_a     uuid := '46000000-0001-0005-0001-0000000000a1';
  v_p_hr_b     uuid := '46000000-0001-0005-0001-0000000000a2';

BEGIN
  -- Canonical author for this file: @chainabit.
  SELECT id INTO v_author FROM lensers.profiles WHERE handle = 'chainabit' LIMIT 1;
  IF v_author IS NULL THEN
    -- Fall back to @lenserfight so seeds still produce inspectable content if
    -- the chainabit profile has not been created yet (partial CI runs).
    SELECT id INTO v_author FROM lensers.profiles WHERE handle = 'lenserfight' LIMIT 1;
  END IF;
  IF v_author IS NULL THEN
    RAISE NOTICE '46_chainabit_productivity_templates: no @chainabit or @lenserfight profile yet — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tool_text     FROM lenses.tools WHERE key = 'text';
  SELECT id INTO v_tool_textarea FROM lenses.tools WHERE key = 'textarea';
  IF v_tool_text IS NULL OR v_tool_textarea IS NULL THEN
    RAISE NOTICE '46_chainabit_productivity_templates: lenses.tools missing — skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_tag_template     FROM content.tags WHERE slug = 'template';
  SELECT id INTO v_tag_chainabit    FROM content.tags WHERE slug = 'chainabit';
  SELECT id INTO v_tag_productivity FROM content.tags WHERE slug = 'productivity';
  SELECT id INTO v_tag_planning     FROM content.tags WHERE slug = 'planning';
  SELECT id INTO v_tag_workflow     FROM content.tags WHERE slug = 'workflow';
  SELECT id INTO v_tag_ai           FROM content.tags WHERE slug = 'ai';
  SELECT id INTO v_tag_github       FROM content.tags WHERE slug = 'github';
  SELECT id INTO v_tag_developer    FROM content.tags WHERE slug = 'developer';
  SELECT id INTO v_tag_operator     FROM content.tags WHERE slug = 'operator';
  SELECT id INTO v_tag_content      FROM content.tags WHERE slug = 'content';
  SELECT id INTO v_tag_marketing    FROM content.tags WHERE slug = 'marketing';
  SELECT id INTO v_tag_checklist    FROM content.tags WHERE slug = 'checklist';
  SELECT id INTO v_tag_table        FROM content.tags WHERE slug = 'table';
  SELECT id INTO v_tag_text         FROM content.tags WHERE slug = 'text';

  IF v_tag_template IS NULL OR v_tag_chainabit IS NULL THEN
    RAISE NOTICE '46_chainabit_productivity_templates: canonical tags missing — run migration 20270812000000 first.';
    RETURN;
  END IF;

  -- ─── 1) Weekly Operating Review ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_wor) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_wor, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_wor, v_lens_wor, 1,
      'You are a Weekly Operating Reviewer. The team metrics for the week are: [[:' || v_p_wor_a || ']]. '
      'The notable events / shipments / blockers are: [[:' || v_p_wor_b || ']]. '
      'Produce an operator-facing review with: '
      '(1) headline of the week in one sentence; '
      '(2) what worked — three concrete decisions or behaviours, with the metric or outcome that proves it; '
      '(3) what did not — same shape; '
      '(4) the single bet for next week with one success metric and one quit criterion; '
      '(5) a "leading indicators to watch" table — metric, current value, target, comment. '
      'Sound like a founder talking to their team, not a corporate retrospective.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_wor WHERE id = v_lens_wor;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_wor_a, v_ver_wor, 'metrics', v_tool_textarea),
      (v_p_wor_b, v_ver_wor, 'events',  v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_wor, 'en', true,
       'Weekly Operating Review',
       'Founder-style weekly review with one headline, three wins, three losses, the next bet, and leading-indicator table.',
       'You are a Weekly Operating Reviewer. Synthesise [[metrics]] and [[events]] into a founder-style review.');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_wor, v_tag_chainabit),
      ('lens', v_lens_wor, v_tag_productivity),
      ('lens', v_lens_wor, v_tag_operator),
      ('lens', v_lens_wor, v_tag_table),
      ('lens', v_lens_wor, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 2) Async Standup Generator ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_stand) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_stand, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_stand, v_lens_stand, 1,
      ‘You are an Async Standup Generator. Yesterday: [[:’ || v_p_st_a || ‘]]. Today’’s plan: [[:’ || v_p_st_b || ‘]]. ‘
      'Produce a tight async standup the user can paste into Slack or Discord. Rules: '
      '(1) lead with the one thing that changed for the team — not a personal task log; '
      '(2) call out one explicit blocker with the unblock owner; '
      '(3) flag any deliverable that is at risk of slipping with a concrete next checkpoint; '
      '(4) end with one short question that invites a colleague to weigh in. '
      'Keep it under 120 words. No emoji unless the user already used one.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_stand WHERE id = v_lens_stand;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_st_a, v_ver_stand, 'yesterday', v_tool_textarea),
      (v_p_st_b, v_ver_stand, 'today',     v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_stand, 'en', true,
       'Async Standup Generator',
       'Turns yesterday/today notes into a tight async standup with explicit blockers, risk flags, and one invite question.',
       'You are an Async Standup Generator. Write a standup from [[yesterday]] and [[today]] (≤120 words).');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_stand, v_tag_chainabit),
      ('lens', v_lens_stand, v_tag_productivity),
      ('lens', v_lens_stand, v_tag_operator),
      ('lens', v_lens_stand, v_tag_text),
      ('lens', v_lens_stand, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 3) PR Triage Brief ────────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_prtr) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_prtr, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_prtr, v_lens_prtr, 1,
      'You are a PR Triage Reviewer. The list of open pull requests is: [[:' || v_p_pr_a || ']]. '
      'Engineering goals this week: [[:' || v_p_pr_b || ']]. '
      'Produce a triage brief for the reviewer pool: '
      '(1) prioritised queue — table with columns PR / Reviewer / Why this priority / SLA in hours; '
      '(2) PRs that should be split or rebased before review and the one-line reason; '
      '(3) PRs that should be parked or closed with a respectful closing message draft; '
      '(4) one structural risk pattern you notice across multiple PRs (testing, migrations, naming). '
      'Be opinionated. The goal is to reduce review queue, not to be diplomatic.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_prtr WHERE id = v_lens_prtr;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_pr_a, v_ver_prtr, 'open_prs',     v_tool_textarea),
      (v_p_pr_b, v_ver_prtr, 'eng_goals',    v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_prtr, 'en', true,
       'PR Triage Brief',
       'Opinionated review-queue triage: prioritised table, split/rebase candidates, park-or-close drafts, and pattern risks.',
       'You are a PR Triage Reviewer. Triage [[open_prs]] against [[eng_goals]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_prtr, v_tag_chainabit),
      ('lens', v_lens_prtr, v_tag_github),
      ('lens', v_lens_prtr, v_tag_developer),
      ('lens', v_lens_prtr, v_tag_table),
      ('lens', v_lens_prtr, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 4) Launch Content Kit ─────────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_kit) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_kit, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_kit, v_lens_kit, 1,
      'You are a Launch Content Strategist. The feature or product being launched is [[:' || v_p_kit_a || ']]. '
      'Audience and channels: [[:' || v_p_kit_b || ']]. '
      'Produce a launch-week content kit: '
      '(1) launch tweet (≤ 240 chars) plus a four-tweet thread; '
      '(2) LinkedIn long-form post (≈ 220 words) framed around the user problem, not the company; '
      '(3) email teaser (subject line + 80-word body) for the existing list; '
      '(4) optional Show-HN or community-forum opener that respects forum norms; '
      '(5) one anti-pattern you avoided in this kit and why. Voice: practitioner, evidence-led, not marketing-deck-flavoured.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_kit WHERE id = v_lens_kit;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_kit_a, v_ver_kit, 'launch_subject', v_tool_textarea),
      (v_p_kit_b, v_ver_kit, 'channels',       v_tool_text);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_kit, 'en', true,
       'Launch Content Kit',
       'Launch week content: tweet+thread, LinkedIn post, email teaser, community opener, and an anti-pattern callout.',
       'You are a Launch Content Strategist. Create a content pack for [[launch_subject]] over [[channels]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_kit, v_tag_chainabit),
      ('lens', v_lens_kit, v_tag_marketing),
      ('lens', v_lens_kit, v_tag_content),
      ('lens', v_lens_kit, v_tag_text),
      ('lens', v_lens_kit, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

  -- ─── 5) Hiring Loop Designer ───────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_hire) THEN
    INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
    VALUES (v_lens_hire, v_author, 'public', 'published');

    INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
    VALUES (
      v_ver_hire, v_lens_hire, 1,
      'You are a Hiring Loop Designer. The role profile is [[:' || v_p_hr_a || ']]. '
      'Stage of company and hiring constraints (budget, urgency, manager bandwidth): [[:' || v_p_hr_b || ']]. '
      'Design an honest interview loop: '
      '(1) the single most-predictive signal for this role and the interview that measures it; '
      '(2) a 4-stage loop with stage name, duration, decision criteria, and a candidate-experience note; '
      '(3) one explicit anti-loop — a stage you considered and chose NOT to include, with the reason; '
      '(4) a candidate-facing one-page summary draft; '
      '(5) the failure mode (false positive or false negative) this loop is most exposed to and the mitigation. '
      'Optimise for signal-per-candidate-hour, not coverage theatre.',
      'published', now()
    );
    UPDATE lenses.lenses SET head_version_id = v_ver_hire WHERE id = v_lens_hire;

    INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
      (v_p_hr_a, v_ver_hire, 'role_profile', v_tool_textarea),
      (v_p_hr_b, v_ver_hire, 'constraints',  v_tool_textarea);

    INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
    VALUES
      ('lens', v_lens_hire, 'en', true,
       'Hiring Loop Designer',
       'Signal-first 4-stage interview loop with anti-loop, candidate one-pager, and the failure mode the loop is exposed to.',
       'You are a Hiring Loop Designer. Design a loop for [[role_profile]] under [[constraints]].');

    INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
      ('lens', v_lens_hire, v_tag_chainabit),
      ('lens', v_lens_hire, v_tag_operator),
      ('lens', v_lens_hire, v_tag_planning),
      ('lens', v_lens_hire, v_tag_checklist),
      ('lens', v_lens_hire, v_tag_template)
    ON CONFLICT DO NOTHING;
  END IF;

END
$seed$;

ANALYZE lenses.lenses;
ANALYZE lenses.versions;
