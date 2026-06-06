---
name: github-issue-solver
description: Read GitHub issues, triage them, solve them using GRASP/OOAD principles, run or add tests, commit, push, open a PR linked to the issue, merge into development, and close the issue only after merge. Use when the user says /github-issue-solver, "solve issue #N", "fix GitHub issue", or "work on issue".
---

# GitHub Issue Solver

Solve GitHub issues end-to-end: triage → explore → design → implement → test → PR → merge → close.

**Never guess architecture. Never close an issue before the PR is merged.**

---

## Activation Criteria

Invoke this skill when:
- User says `/github-issue-solver` or `/solve-issue`
- User says "solve issue #N", "fix GitHub issue #N", "work on issue #N"
- User pastes a GitHub issue URL
- User asks to process open issues from the repository

---

## Workflow

### Step 1 — Fetch Issue Metadata

```bash
gh issue view <number> --json title,body,labels,milestone,assignees,comments,url,state,linkedBranches
```

Capture:
- Title and full body
- Labels (bug, feature, security, docs, performance, DX, auth, database, workflow, battle, CLI, mobile, web)
- All comments (may contain constraints or partial solutions)
- Linked PRs or branches

If no issue number is provided, ask the user which issue(s) to target.

### Step 2 — Check for Duplicates

```bash
gh issue list --state all --search "<key terms from title>"
gh pr list --state all --search "<key terms>"
```

If a duplicate exists: comment linking the canonical issue, then stop.

### Step 3 — Repository Exploration

Do not assume architecture. Explore:

```
apps/*                  — entry points and composition roots
libs/domain/*           — business concepts, invariants, core types
libs/api/*              — contracts and DTOs
libs/data/*             — repositories, Supabase integration
libs/features/*         — feature slices and orchestration
libs/infra/*            — analytics, moderation, storage adapters
libs/ui/*               — UI components, forms, layout, tokens
libs/utils/*            — low-level shared utilities
supabase/               — schema, migrations, RLS policies, SQL functions
.github/workflows/      — CI/CD pipelines and test commands
apps/cli/               — CLI if issue is CLI-related
apps/mobile/            — mobile app if issue is mobile-related
package.json / pnpm-workspace.yaml — test and build commands
CLAUDE.md / CONTRIBUTING.md        — coding standards and rules
.agents/skills/         — available agent skills
```

Load relevant skills before implementing:
- Feature placement → `feature-slice-designer`
- Architecture concern → `repo-architecture-auditor`
- Schema change → `supabase-schema-reviewer`
- RLS/security → `supabase-rls-security-reviewer`
- Migration → `migration-risk-reviewer`
- Contract/DTO → `contract-dto-consistency-reviewer`
- Code quality → `deep-code-reviewer` or `grasp-ooad-review`
- Performance → `vite-performance-engineer`
- UI/UX → `tailwind-ui-ux-reviewer`
- Tests → `unit-test-planner`

### Step 4 — Classify the Issue

| Type | Detection criteria |
|------|-------------------|
| `bug` | Unexpected behavior, crash, incorrect output |
| `feature` | New capability or enhancement request |
| `security` | Auth bypass, data leak, RLS gap, injection |
| `performance` | Slow query, bundle size, N+1, memory leak |
| `docs` | Missing or incorrect documentation |
| `DX` | Dev tooling, CI, build, test setup |
| `database` | Schema change, migration, RLS, index |
| `workflow` | Battle workflow, automation, trigger |
| `CLI` | CLI command, output, TUI |
| `mobile` | Mobile app screen, navigation, native |
| `web` | Web app route, UI, API integration |

### Step 5 — Identify Root Cause

Before writing any code:

1. Trace data flow from symptom back to origin.
2. Identify which module owns the broken invariant.
3. Check domain, data, feature, UI, or infra layer.
4. Confirm whether backend validation is missing (do not enforce only in frontend).
5. Identify affected tests and whether they catch the bug.

State the root cause explicitly before designing a solution.

### Step 6 — Design Solution (GRASP + OOAD)

Apply [references/grasp-ooad-checklist.md](./references/grasp-ooad-checklist.md).

Rules:
- Single source of truth: one place owns each business rule
- Low coupling: changes should not ripple unexpectedly
- High cohesion: related behavior stays together
- Information Expert: assign responsibility to the class with the required data
- Creator: the object that aggregates another creates it
- Controller: one entry point handles a use case
- Backend validation: business rules enforced server-side, never frontend-only
- No duplicated domain logic across layers
- No unrelated refactors bundled with the fix
- No hardcoded temporary fixes
- No security bypasses

Design the solution in 1–3 sentences before touching any file.

### Step 7 — Create a Branch

```bash
git checkout development
git pull origin development
git checkout -b fix/issue-<number>-<short-slug>
# or feat/issue-<number>-<short-slug> for features
```

Never work on `main` or `development` directly. See [`docs/en/how-to/contributors/branching.md`](docs/en/how-to/contributors/branching.md) for naming rules and conventional commit format.

### Step 8 — Implement Minimal Correct Fix

- Edit only files required to resolve the root cause.
- No opportunistic refactors.
- No doc additions unless the behavior change requires them.
- If schema changes are needed, create a new migration in `supabase/migrations/`.
- If RLS changes are needed, invoke `supabase-rls-security-reviewer` first.
- Keep changes auditable: one logical concern per commit.

### Step 9 — Add or Update Tests

Load [references/test-discovery-checklist.md](./references/test-discovery-checklist.md).

```bash
# Discover commands
pnpm nx show project <project> --json | jq '.targets | keys'
grep -rE 'nx (test|run|affected)' .github/workflows/

# Smallest scope first
pnpm nx test <project> --testPathPattern=<spec>
pnpm nx typecheck <project>
pnpm nx lint <project>

# If schema/RLS changed
pnpm supabase test db

# Broader check for critical areas
pnpm nx affected --target=test --base=origin/development
```

If no adequate tests exist for the fixed behavior, add them. Do not ship without test coverage.

### Step 10 — Commit

```bash
git add <specific-files>
git commit -m "$(cat <<'EOF'
fix(scope): concise imperative description

Root cause: <one sentence>

Closes #<issue-number>
EOF
)"
```

- Conventional Commits format
- `Closes #N` only when the PR fully resolves the issue
- Never use `--no-verify`
- Never commit `.env`, secrets, or credentials

### Step 11 — Push and Open PR

```bash
git push -u origin <branch-name>
gh pr create \
  --base development \
  --title "<type>(scope): short description (fixes #N)" \
  --body "$(cat <<'EOF'
## Issue
Closes #<number>

## Root Cause
<one paragraph>

## Solution
<one paragraph>

## Files Changed
- `path/to/file.ts` — what changed and why

## Tests
- [ ] Existing tests pass
- [ ] New tests added for: <what>
- [ ] Typecheck passes
- [ ] Lint passes

## Commands Run
\`\`\`bash
pnpm nx test <project>
pnpm nx typecheck <project>
\`\`\`

## Migration Notes
<!-- If schema changed -->

## Security Notes
<!-- If auth/RLS changed -->

## Screenshots
<!-- If UI changed -->

## Remaining Risks
<!-- Anything not fully addressed -->
EOF
)"
```

Load [references/pr-template.md](./references/pr-template.md) for the full template.

### Step 12 — Monitor CI

```bash
gh pr checks <pr-number> --watch
```

Fix CI failures before merging. Never merge while CI is failing.

### Step 13 — Merge into Development

Only after:
- All CI checks pass
- No unresolved conflicts
- No unsafe migrations
- No security regressions
- Implementation is complete

```bash
gh pr merge <pr-number> --merge --delete-branch
```

### Step 14 — Post-Merge Synchronization

```bash
git checkout development
git pull origin development
pnpm install --frozen-lockfile
pnpm nx typecheck <affected-project>
pnpm nx test <affected-project>
```

If post-merge validation fails, open a follow-up issue immediately and do not close the original.

### Step 15 — Close the Issue

Only after merge is confirmed and post-merge validation passes:

```bash
gh issue close <number> --comment "Fixed in PR #<pr-number> (merged into development)."
```

---

## Issue Closing Rules

| Condition | Action |
|-----------|--------|
| PR merged, fully resolves issue | Close with merge commit reference |
| PR merged, partial fix | Leave open, comment what remains |
| Duplicate | Link canonical issue, close as duplicate |
| Not reproducible | Comment evidence, close as invalid |
| CI fails | Do not merge, do not close |
| Post-merge test fails | Open follow-up, leave original open |

**Never close an issue speculatively or before the PR merges.**

---

## Engineering Constraints

- Single source of truth — one module owns each business rule
- GRASP principles enforced — see [references/grasp-ooad-checklist.md](./references/grasp-ooad-checklist.md)
- Backend validation for all business rules — never frontend-only
- No duplicated domain logic across layers
- No unrelated refactors bundled in the fix
- No hardcoded temporary fixes
- No security bypasses
- No force-push to protected branches
- No `--no-verify` on commits
- No detached HEAD states
- No stale branch work

---

## Failure Handling

| Failure | Response |
|---------|----------|
| Issue not found | Ask user to confirm issue number and repo |
| Cannot reproduce | State what was tried, ask for reproduction steps |
| Root cause unclear | Document exploration, ask for clarification |
| Tests fail after fix | Diagnose failure, do not suppress |
| Migration unsafe | Invoke `migration-risk-reviewer`, halt if risky |
| RLS regression detected | Invoke `supabase-rls-security-reviewer`, halt |
| CI fails | Fix before merging, never skip |
| Merge conflict | Resolve conflict, verify tests still pass |
| Post-merge regression | Open follow-up issue, link to original |

---

## Final Report Format

```
## GitHub Issue Solver — Final Report

### Issue
#<number>: <title>
URL: <url>

### Root Cause
<one paragraph>

### Solution
<one paragraph>

### PR
URL: <pr-url>
Branch: <branch-name>

### Merge
Commit: <hash>
Branch: development
Status: merged / failed

### Post-Merge Validation
- Install: pass / fail
- Typecheck: pass / fail
- Tests: pass / fail
- Migrations: valid / invalid

### Issue Status
Closed / Open (reason)

### Remaining Risks
<bullet list or "none">
```

---

## Example Triggers

- `/github-issue-solver 42`
- `/solve-issue 118`
- "Fix GitHub issue #86"
- "Work on issue #139"
- "Solve the bug reported in issue #84"
