# Template Authoring Guide

This guide describes how to author a public LenserFight template — a Lens, Workflow, Battle, or Agent — that ships with the platform's seed data and lives in the portable `.lenserfight/` tree.

> Before you start, read [`docs/reference/storage-architecture.md`](../../reference/storage-architecture.md) so you understand the portable-vs-runtime separation.

## Reserved authors

Every public template is authored by one of three reserved accounts:

| Handle         | Email                | Used for                                                          |
| -------------- | -------------------- | ----------------------------------------------------------------- |
| `@lenserfight` | `hey@lenserfight.com` | Default author for every public template                           |
| `@chainabit`   | `bit@chainabit.com`  | Productivity / startup-ops templates (the BUILD half)             |
| `@conectlens`  | `lets@conectlens.com` | Community-facing lenses (Thread Starter, Challenge Creator)        |

If your template doesn't belong to `@chainabit` or `@conectlens`, the author is `@lenserfight`.

## Two-step authoring

A template lives in **two synced places**:

1. The `.lenserfight/` tree — human-readable, markdown with YAML frontmatter, reviewed in PRs.
2. The `supabase/seeds/4*_*templates.sql` files — the deterministic-UUID SQL that populates the database.

Both must stay in sync. A pgTAP test fails if a slug exists in one place but not the other.

## Step 1 — Pick a slug

Slugs follow the `content.tags.slug` constraint:

- Lowercase
- 2–40 characters
- `^[a-z0-9]+([\-][a-z0-9]+)*$`

Once published, a slug is immutable. Renaming it breaks `/ray/<slug>` links and every shared template URL.

## Step 2 — Write the `LENS.MD` (or `AGENT.MD`, etc.)

Create the file at `.lenserfight/lenses/<slug>/LENS.MD` with this frontmatter:

```yaml
---
name: <slug>
title: <Human-readable title>
description: <One-sentence what-and-why, ≤ 160 chars. Used by /ray search.>
author: '@lenserfight'           # or @chainabit / @conectlens
visibility: public                # public | unlisted | private
forkable: true                    # whether fn_lens_create can clone it
disclaimer: |                      # MANDATORY for legal/finance templates
  <full disclaimer text>
inputs:
  - label: <param_label>
    tool: text | textarea
    required: true
    example: <one-line example>
outputs:
  kind: text | image | video | audio | table | checklist | script | structured
rays: [<slug>, <slug>, …]          # at least one of the canonical rays
seed_uuid: <deterministic UUID>   # MUST match the SQL seed
---

# <Title>

<body — the actual prompt template using [[param_label]] for substitution>
```

The body is the prompt the model sees. Reference parameters with `[[param_label]]` (the bracket-bracket syntax mirrors the `[[:uuid]]` form the database stores after slug→UUID rewriting).

## Step 3 — Add the SQL seed block

Open the matching seed file under `supabase/seeds/`:

| Category                              | Seed file                                          |
| ------------------------------------- | -------------------------------------------------- |
| Chain primitives (intent, plan, refine) | `40_lens_chain_templates.sql`                      |
| Developer / community lenses          | `41_developer_lens_templates.sql`                  |
| Creator / business / legal / startup  | `45_creator_business_lens_templates.sql`           |
| Chainabit productivity                | `47_chainabit_productivity_templates.sql`          |
| Workflows                             | `42_production_workflow_templates.sql` / `48_workflow_templates.sql` |
| Battles                               | `05_battles.sql` / `51_lenser_character_battles.sql` |

Pick a deterministic UUID following the convention used in the file (e.g. `45000000-0001-LLLL-0001-…` for creator lenses). Reuse the same UUID in the frontmatter's `seed_uuid` field.

The minimum SQL block for a lens:

```sql
IF NOT EXISTS (SELECT 1 FROM lenses.lenses WHERE id = v_lens_<name>) THEN
  INSERT INTO lenses.lenses (id, lenser_id, visibility, status)
  VALUES (v_lens_<name>, v_author, 'public', 'published');

  INSERT INTO lenses.versions (id, lens_id, version_number, template_body, status, published_at)
  VALUES (v_ver_<name>, v_lens_<name>, 1, '<prompt body>', 'published', now());

  UPDATE lenses.lenses SET head_version_id = v_ver_<name> WHERE id = v_lens_<name>;

  INSERT INTO lenses.version_parameters (id, version_id, label, tool_id) VALUES
    (v_p_<name>_a, v_ver_<name>, '<param_a>', v_tool_textarea);

  INSERT INTO content.entity_translations (entity_type, entity_id, language_code, is_original, title, description, content)
  VALUES ('lens', v_lens_<name>, 'en', true, '<title>', '<description>', '<short content>');

  INSERT INTO content.tag_map (entity_type, entity_id, tag_id) VALUES
    ('lens', v_lens_<name>, v_tag_<slug>),
    ('lens', v_lens_<name>, v_tag_template)
  ON CONFLICT DO NOTHING;
END IF;
```

Resolve `v_author` from the reserved handle (`'lenserfight'`, `'chainabit'`, or `'conectlens'`) at the top of the DO block.

## Step 4 — Rays

If your template introduces a ray that does not yet exist, add it to `supabase/migrations/20270812000000_canonical_production_tags.sql` and create a matching `.lenserfight/rays/<slug>/RAY.MD`. Never invent rays in template SQL — always go through the canonical migration.

## Step 5 — Disclaimers (legal / finance only)

If your template touches legal-adjacent or financial content:

- The prompt body MUST instruct the model to include the disclaimer verbatim in every output.
- The `disclaimer:` field in the frontmatter is mandatory.
- A pgTAP test fails if the disclaimer marker string is missing from the `template_body`.

Legal disclaimer (verbatim):

> This review is an analysis aid only and is NOT legal advice. It does not establish an attorney-client relationship. Always have a qualified, licensed lawyer in your jurisdiction review the actual document before signing, negotiating, or relying on it.

Finance disclaimer (verbatim):

> This explanation is an analysis aid only and is NOT certified financial advice, audit work, investment recommendation, or tax guidance. Verify all figures against source records and consult a qualified professional before acting on this material.

## Step 6 — Validate

Run locally:

```bash
pnpm supabase:combine-seeds   # rebuild seed.sql
pnpm supabase:reset           # drop + reseed local DB
pnpm nx test web --testPathPattern=lens-page   # if you have a page test
```

Then visit the lens page in the running web app and confirm it opens, parameters render, and the disclaimer (if applicable) appears in test runs.

## Step 7 — Tests

The seed-quality test suite (`supabase/tests/31_seed_quality.sql`) checks:

- Every public lens has a non-empty `template_body`.
- Every public lens has at least one ray.
- Every legal-/finance-rayed lens contains the disclaimer marker.
- Every workflow node references an existing lens version.
- Every battle references an existing lens or workflow.
- No template author is alice/bob/carol (legacy demo users).

You do not need to add a new test for each template — the existing tests cover the invariants. If your template introduces a new invariant (e.g. a new disclaimer class), extend the test file in the same PR.

## Step 8 — Open the PR

Title format:

```
seed(<category>): add <slug> template
```

Body checklist:

```
- [ ] LENS.MD / WORKFLOW.MD / BATTLE.MD / AGENT.MD added under .lenserfight/
- [ ] SQL seed block added to the matching 4*_*templates.sql file
- [ ] Rays exist in 20270812000000_canonical_production_tags.sql
- [ ] Disclaimer present (if legal / finance)
- [ ] pnpm supabase:reset succeeds locally
- [ ] Template page loads in dev
```

## Common pitfalls

- **Forgetting the manifest.** Add new seed files to `supabase/seed.manifest` or they won't be picked up by `pnpm supabase:combine-seeds`.
- **Putting tokens in the prompt.** Never inline a real API key in `template_body` — use `[[:param]]` and surface the secret via `~/.lenserfight/.env.tokens`.
- **Reusing a slug across categories.** Slugs are globally unique. If `pr-triage-brief` already exists, do not create another.
- **Skipping the disclaimer.** Tests fail and the PR is blocked.
- **UUID drift.** The `seed_uuid` in frontmatter MUST match the SQL constant exactly. Run `rg <uuid>` to confirm.
