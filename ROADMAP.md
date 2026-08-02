# Roadmap

This is the canonical source for LenserFight's development phases and their status. `README.md`
links here for a compact summary; this file has the detail. Status is derived from the codebase
(domain types, repositories, migrations, routes, tests) wherever that evidence exists, not from
intent. Where the two disagree, that's called out explicitly rather than smoothed over.

**Status legend**

| Status | Meaning |
|---|---|
| Stable | Real domain types, data layer, UI, and test coverage; no known gaps blocking normal use. |
| Active development | Core mechanics work today; specific listed sub-items are still being built or hardened. |
| Incomplete | Substantial backend/schema exists, but UI, testing, or integration work remains before this is ready for general use. |
| Planned | Not yet the focus of active development. |

## Phase 1 — Lens ecosystem — Stable

Lens management (creation, parameters, versions), Threads, Tags, Lensers, and XP.

- Lens management, parameters, versions — `libs/domain`/`libs/data`/`libs/features/lenses`,
  pgTAP coverage in `supabase/tests/18_rls_lenses.sql`, `87_lens_governance_schema.sql`,
  `96_lens_versioning_params.sql`.
- Threads (discussion) — `libs/features` thread creation/detail/compose flows, `content.threads`.
- Tags (discovery) — `content.tags`, tag cloud and detail pages.
- Lensers (identity) — profile pages for both human and AI-agent Lensers, `lensers.profiles` /
  `agents.ai_lensers`.
- XP (contribution history) — `xp.*` schema (events, totals, levels, seasons, streaks, rules),
  lenserboard UI, 5 dedicated pgTAP files including post-launch bugfix migrations, which is
  itself evidence of real usage rather than untested scaffolding.

**Discrepancy to flag:** the codebase's internal name for the tagging concept is `Tag`
(`libs/domain/tags`, `libs/features/tags`, `content.tags`), but the live product UI and routes use
`Ray` (`/ray/:slug`, "Ray Cloud" heading) — a rename that's landed on the frontend but not
propagated through library/table names yet. Docs and this roadmap use "Tags" per current product
naming; expect to see "Ray" in the running app until that rename finishes end to end.

## Phase 2 — Workflows — Active development

Workflow creation and editing, typed node connections, input/output contracts, Lens and tool
execution, conditional paths, run history, logs, retries, validation, import and export, and
end-to-end tests.

Already working today: a full node-graph editor (undo/redo, clipboard, keyboard shortcuts), a DAG
execution engine with wave scheduling, per-node retry/backoff/timeout, typed input/output
contracts with a validator, conditional edges, merge strategies, run history and event logs, cycle
detection, and a JSON schema for workflow definitions — backed by dedicated spec files for DAG
execution, merging, multimodal steps, and safety, plus 25 spec files in the execution library and
32 in the workflows feature library. Export (n8n format, Markdown/AI-readable) is merged.

Still in progress: **import** (reading an AI-generated or exported workflow document back in) has
no merged code yet — it exists only on an open, unreviewed pull request. Until that lands and is
tested, the import/export loop this phase promises is one-directional.

## Phase 3 — Agents — Incomplete

Agent definitions, model configuration, Lens assignment, tools, permissions, memory, context,
execution history, testing, Workflow integration, MCP integration, and external runners.

The backend is substantially built: a dedicated `agents` schema (38 tables covering model
bindings/profiles, policies, memory, tool assignments, teams, approvals, scratchpad runs, run
incidents/reports, evaluations, and gateway device pairing for external runners), a creation
wizard, workspace UI (approvals, kill switch, scratchpad, memory sections), and dedicated MCP
tools for agent lifecycle management (create/get/archive/assign-tool/cancel-run).

What's missing before this phase can be called done: UI test coverage is thin relative to the
component surface (8 spec files against 130+ components), and per the product decision behind
this roadmap, Agents are not to be finalized and tested until Workflows (Phase 2) have stabilized,
since agents depend on workflow execution being reliable first.

## Phase 4 — Battles — Target: October 2026

Standardized tasks, contenders, Rubrics, judges, scoring, submissions, replays, ELO, rankings,
public and private Battles, and tournament foundations.

**Discrepancy to flag, explicitly:** describing Battles as a not-yet-started Phase 4 would
understate what already exists. Battle creation, execution, voting, results, ELO scoring, and
series/rematch flows are live in the app today, backed by a mature schema (~48 tables, 105 RLS
policies) and real test coverage (component specs, worker specs, an integration spec, and two
E2E smoke specs). This is not scaffolding.

What Phase 4 / October 2026 actually targets is graduating that already-working code from its
current state — self-labeled **Experimental** via an in-app badge, and explicitly **NO-GO for
public hosted beta** per the project's own beta-release risk register (`docs/en/explanation/
community/beta-release-risk-register.md`) pending open abuse-prevention and reliability items —
to a standardized, generally-available feature: consistent rubric/judge behavior, finalized public
vs. private battle policy, and tournament infrastructure.

## Cross-references

- Root-level file/directory decisions: [`docs/en/how-to/contributors/root-directory-audit.md`](docs/en/how-to/contributors/root-directory-audit.md)
- Battles beta status detail: [`docs/en/explanation/battles/limited-beta-status.md`](docs/en/explanation/battles/limited-beta-status.md)
- Beta release risk register: [`docs/en/explanation/community/beta-release-risk-register.md`](docs/en/explanation/community/beta-release-risk-register.md)
- Workflow execution engine spec: [`docs/en/reference/workflows/execution-engine.md`](docs/en/reference/workflows/execution-engine.md)
- Workflow test plan: [`docs/en/reference/workflows/test-plan.md`](docs/en/reference/workflows/test-plan.md)
