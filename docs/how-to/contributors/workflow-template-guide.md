# Workflow Template Contribution Guide

Workflow templates are pre-built starting points that appear in the "Create Workflow" wizard. Contributing a template lets users skip the blank-page problem for common use cases.

This guide is distinct from the [task schema contribution guide](./task-schema-contribution-guide), which covers battle rubrics. Workflow templates are about execution topology — how lenses are wired together — not evaluation criteria.

## What makes a good template

- Solves a well-defined, recurring use case (summarisation, data extraction, review pipeline, etc.)
- Works with models available to free-tier users (no BYOK required by default)
- Contains at most 5–6 nodes in the first draft — smaller is more learnable
- Has a meaningful title and description that a user can understand without reading the nodes

## File placement

Templates live in `supabase/seeds/` as numbered SQL files. The numbering controls load order — pick the next available slot after the highest existing number:

```
supabase/seeds/
  42_production_workflow_templates.sql
  48_workflow_templates.sql      ← Phase 11 general-purpose templates
  NN_your_templates.sql          ← your contribution goes here
```

Naming convention: `NN_<topic>_workflow_templates.sql`.

## UUID convention

Use a UUID block that doesn't collide with existing seeds. Pick a prefix different from `42000000-`, `48000000-`, etc.:

```
<prefix>-0001-WWWW-SSSS-000000000001
  WWWW = workflow index within this file (0001, 0002, ...)
  SSSS = segment (0001=workflow, 0002=node, 0003=phase, 0004=task)
```

Choose a numeric prefix that's clearly yours (e.g., your issue number).

## Required fields

Each workflow row in `lenses.workflows` needs at minimum:

| Field | Requirement |
|---|---|
| `id` | Stable UUID from your block |
| `lenser_id` | Use the seed lenser UUID (`00000000-0000-0000-0000-000000000001`) |
| `title` | Short, noun-phrase format: "Daily Standup Drafter" |
| `description` | One sentence: what it does, not how |
| `is_template` | `true` |
| `metadata` | JSON with at least `{ "category": "<category>", "difficulty": "beginner|intermediate" }` |

## Testing locally

After writing your SQL file, run the seed against a local Supabase instance:

```bash
pnpm supabase start
pnpm nx run supabase:seed
```

Then open the Create Workflow wizard (`/workflows/new`) and verify your template appears in the gallery with the correct title, description, and category.

## PR checklist

Before opening your PR:

- [ ] Template appears in the wizard gallery locally
- [ ] `is_template = true` on the workflow row
- [ ] All node `lens_id` references point to existing lens UUIDs (from `40_` or `41_` seed files)
- [ ] UUID block doesn't collide with existing seeds (grep for your prefix)
- [ ] SQL file is idempotent (`INSERT ... ON CONFLICT DO NOTHING` or wrapped in `DO $$ BEGIN ... END $$`)
- [ ] Label the PR `good-first-workflow-template`

## Category values

Use one of the established categories from `42_production_workflow_templates.sql`:

- `research` — information gathering and synthesis
- `content` — writing, editing, summarisation
- `data` — extraction, transformation, validation
- `qa` — review, testing, comparison
- `communication` — emails, messages, reports
- `productivity` — personal automation, scheduling, reminders
- `developer` — code review, docs, CI helpers
