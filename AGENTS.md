# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Performance Under Stress

**Every change must survive heavy load.** Before finishing, mentally stress the code at ~1M concurrent or near-concurrent users and account for memory usage, CPU cost, and network round-trips — flag N+1 queries, unbounded loops, blocking I/O, retry storms, and missing TTL/pagination instead of shipping them.

## 5. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# Nx
- Run tasks via `pnpm nx run/run-many/affected`. Never guess flags — use `nx_docs` or `--help`.
- Scaffold: invoke `nx-generate` skill first. Explore: invoke `nx-workspace` skill first.
- Plugin docs: `node_modules/@nx/<plugin>/PLUGIN.md` (skip if missing).

# Operating Model
Instructions: `AGENTS.md` · Runtime: `.codex/config.toml` · Roles: `.codex/agents/*.toml` · Skills: `.agents/skills/*` `.claude/skills/*` `.gemini/skills/*`

Prefer existing skills before inventing workflows. Keep changes minimal, local, reversible. Preserve product/UI/test/Supabase boundaries. Docs: operational and concrete, no marketing language.

**Roles:** `ci-monitor` — CI/pipeline failures · `explorer` — trace paths, no edits · `reviewer` — arch/release/security risk · `worker` — implement once path is clear

# LenserFight

**Stack:** Nx monorepo · `apps/web` entry · `supabase/` DB · Supabase backend.

**Layers (low→high):** `domain` → `api` → `data` → `features` · `infra` · `providers` | cross-cut: `shared` `types` `ui` `utils`

**Mobile env:** No `import.meta.env` in Metro/Hermes. Use `process.env.EXPO_PUBLIC_*`. Add `.native.tsx` stubs for web-only barrel exports.

## Skills

| Task | Skill |
|---|---|
| Repo shape/cycles/tags | `repo-architecture-auditor` |
| Feature placement | `feature-slice-designer` · `repo-performance-guard` |
| Responsibility/coupling | `grasp-ooad-review` |
| Vite/React perf† | `vite-performance-engineer` · `react-vite-performance-reviewer` |
| Tailwind/UX/a11y/tokens | `tailwind-ui-ux-reviewer` · `ui-contract-guard` |
| i18n/locale/SEO | `apps-language-rules` · `language-integrator` |
| Mobile design/impl/product | `mobile-app-designer` · `mobile-app-integrator` · `mobile-app-product-owner` |
| Mobile perf/locale† | `mobile-app-reviewer` · `react-native-performance-reviewer` · `mobile-language-checker` · `mobile-ruleset` |
| Tests | `unit-test-planner` · `unit-tester` |
| Deep review/security | `deep-code-reviewer` · `security-reviewer` |
| DTOs/contracts/data | `contract-dto-consistency-reviewer` · `api-contract-reviewer` · `repository-pattern-reviewer` |
| DB/RLS/indexes | `supabase-schema-reviewer` · `database-schema-reviewer` · `supabase-rls-security-reviewer` · `supabase-index-trigger-reviewer` · `supabase-api-rpc-reviewer` |
| Migration risk | `migration-risk-reviewer` |
| AI cost / token waste | `ai-cost-manager-reducer` |
| Docs (refactor / new pages) | `docs-manager` |
| Commits/docs/product | `smart-commit` · `docs-publication-manager` · `product-owner-decider` · `release-readiness-reviewer` |

† Enforce before approving any React/Vite or React Native/Expo change.

Before approving or modifying AI-powered code, always consider AI cost, token usage, repeated AI calls, cache opportunities, model-routing efficiency, and whether the optimization preserves the full reasoning chain and system correctness.

## Teams (cross-layer only)
`supabase-platform-team` · `frontend-experience-team` · `feature-delivery-team` · `release-governance-team` · `architecture-review-team`

**Delivery:** Lead with findings · risky changes get rollout/rollback notes · DB work calls out grants/RLS/indexes/triggers · frontend calls out UX regressions/a11y/bundle · tests justify the layer.

**Validation:** Run smallest relevant check. State what was/wasn't validated. If CI wasn't run, say so.

<!-- nx configuration end-->
