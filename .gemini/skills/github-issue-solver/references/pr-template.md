# PR Body Template

Use this template when creating a PR via `gh pr create`. Fill in all sections; delete sections that genuinely do not apply (e.g., no migration → remove Migration Notes).

```markdown
## Issue

Closes #<number>
<!-- Use "Closes" only when the PR fully resolves the issue.
     Use "Relates to" when it is a partial fix. -->

## Root Cause

<!-- One paragraph describing what was broken and why.
     Focus on the invariant that was violated, not just the symptom. -->

## Solution

<!-- One paragraph describing what was changed and why this approach was chosen.
     Reference GRASP/OOAD principles if the design decision was non-obvious. -->

## Files Changed

<!-- List every file with a one-line explanation of what changed and why.
     Do not list test files here — put them in the Tests section. -->

- `libs/domain/battles/src/battle.service.ts` — added null guard on status transition
- `supabase/migrations/20271122000000_fix_battle_status.sql` — added CHECK constraint

## Tests

<!-- What tests cover this fix? -->

- [ ] Existing tests pass: `pnpm nx test <project>`
- [ ] New unit tests added: `<file>` — tests <what behavior>
- [ ] Integration tests pass: `pnpm nx test <integration-project>`
- [ ] Typecheck passes: `pnpm nx typecheck <project>`
- [ ] Lint passes: `pnpm nx lint <project>`
- [ ] pgTAP tests pass (if schema changed)

## Commands Run

```bash
pnpm nx test battles --testPathPattern=battle.service
pnpm nx typecheck battles
pnpm nx lint battles
```

## Migration Notes

<!-- Required if any Supabase migration was added or modified. -->
<!-- State: what table/column/policy changed, rollback impact, data loss risk. -->

- Migration: `supabase/migrations/<timestamp>_<name>.sql`
- Rollback: safe / unsafe (explain if unsafe)
- Data loss risk: none / low / high (explain)
- RLS impact: none / affected policies listed

## Security Notes

<!-- Required if auth, RLS, API keys, session tokens, or provider logic changed. -->

- RLS policies affected: yes / no
- Auth flow changed: yes / no
- Exposed schema changed: yes / no

## Screenshots

<!-- Required if any UI changed. Include before/after if relevant. -->

## Remaining Risks

<!-- Be honest about what is not fully addressed.
     If none, write "None identified." -->
```
