---
name: .lenserfight portable assets
description: Project-tracked, portable LenserFight assets — lenses, lensers, colenses, battles, and rays. Sensitive runtime state lives under ~/.lenserfight/.
---

# `.lenserfight/` — Portable LenserFight Assets

This directory holds the **portable** half of LenserFight's two-tier filesystem. Everything here is safe to commit, share, and publish. Sensitive per-user state — secrets, sessions, local battle execution traces, machine config — lives under the **runtime** half at `~/.lenserfight/` and must never appear in a repository.

> See [`docs/en/reference/storage-architecture.md`](../docs/en/reference/storage-architecture.md) for the full project-vs-runtime separation rules.

## Current template pack

The project pack now includes production-oriented lensers, lenses, colenses, battles, rays, and safe defaults in `.lenserfight/config.json`.

Core relationships:

- Lensers define reusable AI roles.
- Lenses define reusable prompt perspectives or transformations.
- Colenses compose lenses and lensers into repeatable processes.
- Battles compare lenses, colenses, lensers, prompts, models, or outputs against explicit rubrics.
- Rays group items into routeable categories such as `developer`, `creator`, `finance`, `legal`, `startup`, `productivity`, `ai-comparison`, `multimodal`, and `operations`.

Use:

```bash
lf validate
lf validate --no-global
lf validate .lenserfight/colenses/pr-review/COLENS.MD
```

Override behavior, highest priority first:

1. Runtime CLI flags and explicit command arguments.
2. Item-level frontmatter.
3. Nearest nested `.lenserfight`.
4. Project-root `.lenserfight`.
5. User-global `~/.lenserfight`.
6. Built-in CLI defaults.

When a user-global and project-local item share the same `kind:slug`, the project-local item wins. Keep private personal templates in `~/.lenserfight`; do not commit personal prompts, customer data, generated outputs, caches, tokens, or provider keys.

Template coverage:

- Developers: `code-reviewer`, `github-issue-triage`, `unit-test-generator`, `refactor-planner`, `architecture-decision-review`, `release-readiness`, `incident-postmortem`, `api-contract-reviewer`.
- Creators: `blog-outline-generator`, `youtube-script-generator`, `video-storyboard-planner`, `thumbnail-prompt-generator`, `newsletter-writer`, `social-post-generator`, `youtube-content`.
- Finance and business: `finance-report-explainer`, `budget-planner`, `kpi-reviewer`, `investor-update-drafter`, `revenue-experiment-planner`, `finance-report-review`.
- Legal-adjacent: `legal-contract-reviewer`, `contract-summary`, `legal-risk-checklist`, `questions-for-lawyer`, `terms-of-service-review`, `policy-comparison`, `legal-document-review`.
- Startup and productivity: `startup-roadmap-designer`, `go-to-market-planner`, `founder-weekly-review`, `customer-interview-analysis`, `launch-checklist`, `competitive-analysis`, `daily-productivity-planner`, `meeting-notes-summarizer`, `decision-memo`, `task-prioritization`.
- AI comparison: `ai-output-comparator`, `reasoning-quality-comparison`, `ai-model-comparison`, `claude-vs-openai-pr-review`, `reasoning-quality-shootout`.
- Multimodal: `ai-image-prompt-builder`, `video-storyboard-planner`, `screenshot-review`, `diagram-explainer`, `visual-content-plan`.

Legal-adjacent outputs must state that they are not legal advice and must be reviewed by a qualified lawyer. Finance outputs must state that they are not financial advice.

Full docs: [`docs/lenserfight-file-system.md`](../docs/lenserfight-file-system.md). Practical tutorials: [`docs/en/tutorials/file-based-cli-basics.md`](../docs/en/tutorials/file-based-cli-basics.md), [`docs/en/tutorials/file-based-cli-global-and-monorepo.md`](../docs/en/tutorials/file-based-cli-global-and-monorepo.md), [`docs/en/tutorials/file-based-cli-pr-and-content-workflows.md`](../docs/en/tutorials/file-based-cli-pr-and-content-workflows.md), and [`docs/en/tutorials/file-based-cli-legal-finance-startup.md`](../docs/en/tutorials/file-based-cli-legal-finance-startup.md).

## Directory layout

```
.lenserfight/
├── README.md               ← this file
├── lenses/                 ← LENS.MD (and SKILL.MD alias) per lens template
│   └── <slug>/
│       ├── LENS.MD         ← canonical, ConectLens-native form
│       ├── SKILL.MD        ← optional industry-compatibility alias
│       ├── references/     ← supporting prompt fragments, examples
│       ├── assets/         ← non-secret static assets
│       ├── templates/      ← parameter placeholder examples
│       └── scripts/        ← optional generator/test scripts
├── lensers/                ← LENSER.MD per lenser template
│   └── <slug>/LENSER.MD
├── colenses/               ← COLENS.MD per colens template
│   └── <slug>/COLENS.MD
├── battles/                ← BATTLE.MD per battle template
│   └── <slug>/BATTLE.MD
└── rays/                   ← RAY.MD per canonical production ray
    └── <slug>/RAY.MD
```

## Core terminology

LenserFight is part of the **ConectLens** ecosystem. The platform uses native terminology in `.MD` filenames so the on-disk vocabulary matches the runtime database:

| File         | Concept                                                      | DB table              |
| ------------ | ------------------------------------------------------------ | --------------------- |
| `LENS.MD`    | A reusable prompt asset — a single AI instruction unit       | `lenses.lenses`       |
| `LENSER.MD` | A person or AI profile that owns lenses and execution policy | `lensers.profiles`, `agents.ai_lensers` |
| `COLENS.MD` | A DAG of lens nodes feeding outputs into each other          | `lenses.workflows`    |
| `BATTLE.MD`  | A scored competition between contenders                      | `battles.battles`     |
| `RAY.MD`     | A discovery ray (`/ray/:slug` route)                         | `content.tags`        |

`SKILL.MD` is supported as an industry-compatibility alias for `LENS.MD` — many OSS AI ecosystems use `SKILL.MD` for the same concept. Legacy `agents/AGENT.MD` and `workflows/WORKFLOW.MD` are read for compatibility only; canonical files are `lensers/LENSER.MD` and `colenses/COLENS.MD`.

## What MUST NOT live here

The rules in `docs/en/reference/storage-architecture.md` are strict. The short list:

- API tokens, OAuth refresh tokens, signed URLs
- `.env`, `.env.user`, `.env.tokens` (these belong in `~/.lenserfight/secrets/`)
- Local battle execution traces, cached AI responses, runtime checkpoints
- Per-machine overrides
- Anything that can identify a specific operator

If you find one of these in this tree, treat it as a bug — open an issue and quarantine the file.

## How seeds map to this tree

Every public template under `supabase/seeds/4*_*templates.sql` has a 1:1 sibling under `.lenserfight/`. The mapping is by **slug**, not UUID, so it survives DB resets and re-numbering:

| Seed file                                       | Tree location                                                  |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `40_lens_chain_templates.sql`                   | `.lenserfight/lenses/intent-clarifier/`, … (chain primitives)   |
| `41_developer_lens_templates.sql`               | `.lenserfight/lenses/code-reviewer/`, …                         |
| `45_creator_business_lens_templates.sql`        | `.lenserfight/lenses/youtube-script-generator/`, …              |
| `47_chainabit_productivity_templates.sql`       | `.lenserfight/lenses/weekly-operating-review/`, …               |

The seed file is the source of truth for the database row; the `.MD` file is the source of truth for human reviewers, contributors, and downstream agent ecosystems. **Both must stay in sync.** A pgTAP test enforces that every seeded slug has a matching directory here.

## Authoring a new template

1. Pick a slug — lowercase, hyphenated, ≤ 40 chars (matches `content.tags.slug` rules).
2. Create `.lenserfight/lenses/<slug>/LENS.MD` with the frontmatter schema below.
3. Add the corresponding SQL block to the matching seed file under `supabase/seeds/4*_*templates.sql`.
4. Add rays via `.lenserfight/rays/<slug>/RAY.MD` if you introduce a new one.
5. Run `pnpm supabase:combine-seeds && pnpm supabase:reset` locally and confirm the lens page loads.

### `LENS.MD` frontmatter schema

```yaml
---
name: <slug>
title: <Human-readable title>
description: <One-sentence what-and-why. Used by /ray search.>
author: '@lenserfight' | '@chainabit' | '@conectlens'
visibility: public | unlisted | private
forkable: true | false
disclaimer: <required for legal/finance templates>
inputs:
  - label: <param_label>
    tool: text | textarea
    required: true | false
    example: <one-line example value>
outputs:
  kind: text | image | video | audio | table | checklist | script | structured
tags:
  - <slug>
seed_uuid: <deterministic UUID matching the SQL seed>
---
```

The body of `LENS.MD` is the actual prompt template using `[[param_label]]` for parameter substitution.

## Conventions to remember

- Slugs are stable. Renaming a slug breaks every `/ray/<slug>` link and every published share URL.
- UUIDs in seeds are stable. Never change a seed UUID once it has shipped.
- The `disclaimer:` field is mandatory for any template that touches legal or financial advice. Tests fail if it is missing on a tagged-`legal` or tagged-`finance` lens.
- `forkable: true` requires that the template can produce a clean clone via `fn_create_lens` / `fn_clone_workflow` / `fn_battles_create_rematch`.
- The first non-frontmatter heading of every `.MD` file should be `# <Title>` matching the frontmatter `title:`.

## Related docs

- [`docs/en/reference/storage-architecture.md`](../docs/en/reference/storage-architecture.md) — project vs. runtime separation rules
- [`docs/en/how-to/contributors/template-authoring.md`](../docs/en/how-to/contributors/template-authoring.md) — how to write a `LENS.MD`
- [`docs/en/reference/community-api/ai-lensers.md`](../docs/en/reference/community-api/ai-lensers.md) — agent API
