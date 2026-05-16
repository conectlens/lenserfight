---
title: Known Limitations
description: Current constraints in LenserFight Community Edition — scheduling, approvals, memory, battles, and docs coverage. No apology, no roadmap hype.
---

# Known Limitations

These are real constraints in the current release. They are not bugs — they are deliberate scope cuts or engineering decisions with known trade-offs. Read this before deploying or evaluating LenserFight.

---

## Scheduling

**CRON scheduling requires a full Supabase instance.**
The dispatch function runs inside Postgres via `pg_cron`. SQLite, PlanetScale, local-only Postgres without the pg_cron extension, and Supabase Edge Functions alone will not work. There is no in-process scheduler.

**Schedule history is capped at 50 runs per query.**
`lf schedule history <id>` reads the most recent runs from `lenses.workflow_runs` filtered by the schedule's `workflow_id`. The default page size is 10; `--limit` accepts 1–50. Older history beyond 50 entries requires a direct SQL query.

**Missed-run behavior defaults to skip.**
If the pg_cron worker was down during a scheduled window, the run is skipped by default. Back-fill mode (`queue_policy.onMissed='backfill'`) exists but is not surfaced in the CLI yet.

**Calendar overlays are per-account; seeds are read-only.**
Schedules can attach a calendar to skip on holidays or run only on listed dates. The three built-in seeds (`us-federal-holidays-2026`, `tr-public-holidays-2026`, `weekends-only`) are read-only; operators create their own calendars per-account via `lf schedule calendar create`.

**Schedule preview is bounded to 31 days / 200 ticks.**
`lf schedule preview` walks forward minute-by-minute using `fn_cron_matches_now` as the oracle and stops at whichever bound is reached first. Larger windows require a custom cron parser; today the function does not expose one.

---

## Automation engine

**Dispatch latency is bounded by `pg_cron` granularity (≤ 60 s p99).**
The automation dispatcher runs once per minute via `pg_cron`. An emitted event is matched and dispatched on the next tick. Sub-second push-mode via `LISTEN/NOTIFY` is a known follow-up; for now, time-sensitive reactions should use a polling worker against `automation.events` directly.

**Filter DSL is intentionally minimal.**
[`match_filter`](/en/reference/automation/trigger-rule-schema) supports five operators (`eq, neq, gt, lt, contains`) over JSON-Pointer paths. Richer logic (regex, conjunctions across paths, computed fields) is not in scope — operators that need it should target a `dispatch_workflow` action and put the logic inside the workflow.

**Producer event types are a fixed set.**
The Phase U release ships five seed events (`battle.finalized`, `battle.flagged`, `workflow_run.completed`, `workflow_run.failed`, `approval.granted`, `approval.timed_out`). Custom event types require a database migration that wires a new producer trigger.

---

## Approvals

**Approval webhook is fire-and-forget — no retry, no email/push transport.**
When `app.approval_webhook_url` is configured, every newly-created pending approval fires a single best-effort POST via `pg_net`. There is no retry on delivery failure, no built-in email or push transport, and no signing — operators receive a delivery on a best-effort basis only. For at-least-once delivery, poll `agents.approval_requests_v` and reconcile.

**Each run requires individual approval — no batch or standing approval.**
There is no "approve any run from this schedule in the next 24 hours" surface. Every scheduled dispatch creates its own pending entry that must be decided individually.

**Multi-approver workflows are not supported.**
A single owner or co-owner decision is final. M-of-N approval schemes are not modelled.

---

## Tools and memory

**Tool invocation logs are per-invocation — no cross-workflow rollup.**
`platform.tool_invocation_logs` records individual invocations. There is no aggregated view that shows total tool usage across all runs for an agent or a time period.

**Memory full-text search uses Postgres `english` dictionary only.**
`lf memory search` queries `agents.memories.content` via a GIN-indexed tsvector. Non-English content is searchable but ranking is biased toward English stemming. Semantic similarity (vector search) is not yet exposed.

**Memory checkpoint policy is opt-in per workflow node.**
The default `memory_write_policy='on_success'` discards buffered entries on failure. Workflows that need partial-write durability must set `memory_write_policy='checkpoint'` on each node where intermediate memory should survive a failure.

---

## Battles

**Local battles use local provider keys — no cost cap enforcement.**
`lf battle local run` calls your provider API directly using your configured key. LenserFight does not impose a spending limit on local battle execution. Your provider's own rate limits apply.

**Cloud battles are Private Alpha and require an explicit access grant.**
operator-approved cloud battles expose the cloud arena UI and worker, but the surface is not open for general use. The moderation system, voting integrity checks, and abuse mitigations must pass the [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) before any public rollout.

**Local battle encryption depends on your local key.**
New battle state is written to user runtime storage and encrypted with `LENSERFIGHT_LOCAL_BATTLE_KEY`. Legacy `.lenserfight/local-battles/{id}.json` files may still exist in project roots and can contain private prompts or outputs. Do not commit those files.

**Rematch flow does not preserve vote totals or voter participation.**
[`lf battle rematch`](/en/reference/cli/battle#battle-rematch) and the BattleResultPage rematch button clone structural fields only (task, rubric, contender slots) via [`fn_battles_create_rematch`](/en/explanation/battles/rematches-and-series). Vote totals, voter records, contender comments, and execution outputs are not carried forward. The rematch starts as `draft` and the owner must re-publish, re-execute, and run the lifecycle from scratch.

**Tournament series cron coarsens to hourly.**
The `series-rematch-dispatcher` pg_cron job runs at `0 * * * *`. Sub-hourly cron expressions on `battles.series.cron_expr` are accepted by the validator but observed only at hour boundaries — `*/5 * * * *` will fire at most once per hour. See [Rematches, Replays, and Series](/en/explanation/battles/rematches-and-series#tournament-series).

**Battle share cards render as SVG, not PNG.**
[`GET /v1/battles/:slug/share-card.svg`](/en/reference/battles/share-card-api) returns `image/svg+xml`. All major social crawlers (Slack, Discord, Twitter/X, LinkedIn, Facebook) rasterize SVG correctly when fetching `og:image`, so this is functionally equivalent to a PNG today. A `@vercel/og`-based PNG upgrade is tracked as a follow-up in the route source.

---

## API and docs

**OpenAPI 3.1 spec is published but not auto-generated from route handlers.**
The HTTP API surface is described in [`docs/reference/platform-api/openapi.yaml`](https://github.com/conectlens/lenserfight/blob/main/docs/reference/platform-api/openapi.yaml). The spec is hand-authored against the DTOs in `libs/api/contracts/`; CI lints it with `redocly` but does not yet diff it against the route handler signatures. Drift is possible.

**Turkish documentation lags English on niche pages.**
High-traffic pages (Quickstart, OSS Launch Scope, Known Preview Surfaces) are translated. Deep-dive reference pages remain English-only and are not linked from the Turkish nav.

**The CLI reference documents proposed commands alongside shipped commands.**
Some `lf` subcommands described in the reference docs are marked "Proposed" and are not yet implemented. The CLI help (`lf --help`, `lf <command> --help`) is authoritative for what is currently available.

**Multi-profile config tokens are stored unencrypted at rest.**
[`lf profile`](/en/reference/cli/profile) writes profile JSON files to `~/.lenserfight/profiles/<name>.json` with mode `0600`. Anyone with read access to the operator's home directory (root, backups, a compromised account) can extract `access_token` and `refresh_token` directly. The CLI does not integrate with system keychains. Operators that need stricter handling should leave the tokens out of the file and inject them at runtime via `LF_PROFILE` paired with a per-shell credential manager (`pass`, `1password-cli`, `keychain`).

---

## Agentic teams

**Team-message bus is capped at 1000 messages per team_run.**
A BEFORE INSERT trigger on `agents.team_messages` enforces the cap and raises `ERRCODE 54000` (`team_messages_cap_exceeded`) on the 1001st insert. Higher caps require operator coordination via SQL — the limit is a constant inside `agents.fn_enforce_team_messages_cap()` with no per-team_run override.

**Shared scratchpad uses optimistic locking — concurrent merges produce a conflict.**
`agents.fn_merge_shared_scratchpad` requires the caller's `expected_version` to match the current `shared_scratchpad_version`. Two agents merging at the same version produce one success and one `40001 scratchpad_version_conflict` error. Clients must implement bounded retry; the conflict is a normal serialization-failure signal, not a hard error.

**Delegation policy is a forward declaration — the engine has no live delegation path yet.**
`WorkflowNodeConfig.delegationPolicy` (`auto | approval_required | forbidden`) and the helpers `resolveDelegationPolicy` / `assertDelegationAllowed` ship in [`libs/infra/execution/src/lib/workflow-execution.service.ts`](../../libs/infra/execution/src/lib/workflow-execution.service.ts), but the execution runtime does not yet enforce them at delegation-time. Setting `forbidden` today is documentation-only. The policy will be enforced when the delegation runtime ships.

**Role gating is opt-in.**
The Phase X CHECK on `agents.team_members.role` admits `('leader','executor','reviewer','observer','operator')`. Pre-existing rows defaulting to `operator` are unaffected by the new role-aware gates (`fn_node_requires_review`, leader-only delegation, etc.) — they silently bypass them. Operators that want gating must explicitly set roles via `lf team set-role`.

---

## Self-hosted installs

**Supabase seed takes several minutes on first run.**
The seed script (`supabase/seed.sql`) applies all RPCs, views, and initial data. On a cold local Supabase instance this can take 3–5 minutes. This is a one-time cost.

**Environment variable changes require restarting the dev server.**

Vite only reads `import.meta.env` values when the dev server starts. After editing `.env` / `.env.local`, restart `pnpm nx run web:serve` (and the same for `auth` / `arena` if you changed their env files).

---

## Related

- [Known Preview Surfaces](/en/reference/known-preview-surfaces) — gating and rollback instructions
- [OSS Launch Scope](/en/explanation/community/oss-launch-scope) — what is and is not part of this release
- [Battle Integrity Checklist](/en/how-to/battles/battle-integrity-checklist) — required checks before enabling cloud battles
- [Team Coordination](/en/explanation/agents/team-coordination) — Phase X primitives backing the agentic-teams limits above
