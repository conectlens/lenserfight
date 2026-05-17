# Issue Triage Checklist

Use this checklist when deciding whether and how to solve a GitHub issue.

## 1. Validity Check

- [ ] Issue is open and not already fixed in development
- [ ] Issue is not a duplicate (search confirmed)
- [ ] Issue has enough information to reproduce or implement
- [ ] Issue is within scope of this repository

If duplicate → link canonical issue and close.
If invalid → comment with evidence and close as invalid.
If insufficient info → ask for reproduction steps, do not start implementation.

## 2. Issue Type Classification

- [ ] Bug — unexpected behavior, crash, data corruption, incorrect output
- [ ] Feature — new capability or enhancement
- [ ] Security — auth gap, RLS hole, data leak, injection risk
- [ ] Performance — slow query, N+1, bundle size, memory leak
- [ ] Docs — missing or incorrect documentation
- [ ] DX — CI, build, tooling, test setup
- [ ] Database — schema, migration, RLS, index
- [ ] Workflow — battle automation, triggers, event processing
- [ ] CLI — CLI command behavior, output, TUI
- [ ] Mobile — mobile screen, navigation, native behavior
- [ ] Web — web route, UI component, API integration

## 3. Scope Assessment

- [ ] Which apps are affected? (`apps/web`, `apps/cli`, `apps/mobile`)
- [ ] Which lib layers are affected? (domain, api, data, features, infra, ui, utils)
- [ ] Is Supabase / database affected?
- [ ] Is an RLS policy affected?
- [ ] Is a migration needed?
- [ ] Does this touch auth or security boundaries?
- [ ] Is this a breaking change for API consumers?

## 4. Skill Loading Decision

Load before implementing:

| Condition | Skill to load |
|-----------|---------------|
| New feature placement unclear | `feature-slice-designer` |
| Architecture concern | `repo-architecture-auditor` |
| Schema change needed | `supabase-schema-reviewer` |
| RLS policy affected | `supabase-rls-security-reviewer` |
| Migration needed | `migration-risk-reviewer` |
| Contract / DTO mismatch | `contract-dto-consistency-reviewer` |
| Code quality concern | `deep-code-reviewer` or `grasp-ooad-review` |
| Performance issue | `vite-performance-engineer` |
| UI/UX change | `tailwind-ui-ux-reviewer` |
| Test coverage needed | `unit-test-planner` |
| Docs change needed | `docs-publication-manager` |
| Mobile change | `mobile-app-reviewer` |

## 5. Risk Rating

Rate before starting implementation:

| Risk | Level |
|------|-------|
| Data loss possible | critical |
| RLS bypass possible | critical |
| Auth regression possible | critical |
| Migration irreversible | high |
| API breaking change | high |
| UI regression | medium |
| Isolated logic fix | low |

If risk is critical or high: consult relevant security/migration skill before coding.

## 6. Actionability Gate

Issue is actionable only if:
- [ ] Root cause is understood or traceable
- [ ] Solution design passes GRASP/OOAD review
- [ ] No blocking dependencies exist
- [ ] Risk is acceptable or mitigated

If not actionable: comment on the issue with what is needed, then stop.
