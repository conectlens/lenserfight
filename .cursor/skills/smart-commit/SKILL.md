---
name: smart-commit
description: Detect staged and unstaged git changes, classify them by type (feat/fix/refactor/docs/chore/test/style/perf), group into logical commit units, then commit each group separately with user approval. Use when the user wants to commit their current work, wants help writing a commit message, or says /commit or /smart-commit.
---

# Smart Commit

Inspect the working tree, **classify every change first**, group into logical commits, then handle each commit separately with explicit user approval.

**Never commit without user confirmation. Never lump unrelated changes into one commit.**

---

## Workflow

### Step 1 — Snapshot the working tree

Run all three commands and keep the output in context:

```bash
git status --short
git diff --stat HEAD
git diff --cached --stat
```

If both staged and unstaged areas are empty, tell the user there is nothing to commit and stop.

### Step 2 — Read the full diff

```bash
# Staged changes
git diff --cached

# Unstaged changes
git diff
```

Skim hunks to understand *what* changed, not just *which* files. Treat both staged and unstaged as candidates — classification covers everything.

### Step 3 — Classify ALL changes (REQUIRED FIRST STEP)

This step is mandatory before any staging or committing decision is made.

Map **every changed file** (staged or unstaged) to a conventional-commit type:

| Type       | When to use |
|------------|-------------|
| `feat`     | New user-visible feature or capability |
| `fix`      | Bug fix or incorrect behavior corrected |
| `refactor` | Code restructuring with no behavior change |
| `perf`     | Performance improvement |
| `test`     | Adding or updating tests only |
| `docs`     | Documentation, comments, README only |
| `style`    | Formatting, whitespace, lint — no logic change |
| `chore`    | Build scripts, deps, tooling, config |
| `ci`       | CI/CD pipeline changes |
| `revert`   | Reverts a previous commit |

Output a **classification table** immediately:

| File | Status | Type | Scope | Brief description |
|------|--------|------|-------|-------------------|
| `path/to/file.ts` | staged/unstaged | `feat` | `auth` | Added login form |
| `path/to/other.ts` | unstaged | `chore` | `deps` | Updated lockfile |

Do not proceed to Step 4 until this table is shown to the user.

### Step 4 — Group into logical commit units

Based on the classification, propose separate commits for each distinct type/scope cluster. **Do not merge unrelated types into one commit.**

Rules for grouping:
- Same type + same scope → one commit candidate
- Different types → separate commits
- Unrelated features in the same type → separate commits (use judgment)
- A single large feat that also touches tests → two commits (`feat` + `test`) unless trivially inseparable
- Purely mechanical changes (style, chore, docs) should never be bundled with feat/fix

Present the proposed grouping:

> **Proposed commit plan (N commits):**
>
> **Commit 1** — `feat(auth)`: login form + validation
> Files: `src/auth/LoginForm.tsx`, `src/auth/validators.ts`
>
> **Commit 2** — `test(auth)`: add login form tests
> Files: `src/auth/LoginForm.test.tsx`
>
> **Commit 3** — `chore(deps)`: update lockfile
> Files: `pnpm-lock.yaml`

Ask the user:

> Does this grouping look right? Reply **yes** to proceed group by group, **regroup \<instructions\>** to adjust, or **cancel** to abort.

Wait for confirmation before continuing.

### Step 5 — Handle each commit group, one at a time

For each proposed commit group (in order):

#### 5a — Stage the files for this group

Stage only the files belonging to this group:

```bash
git add path/to/file1 path/to/file2
```

Never use `git add -A` or `git add .` unless the user explicitly requests it for a specific group.

#### 5b — Draft the commit message

Format: Conventional Commits v1.0

```
<type>(<optional scope>): <short imperative summary, ≤72 chars>

<optional body: what changed and why, wrapped at 72 chars>

<optional footer: breaking changes, closes #issue>
```

Rules:
- Summary line: imperative mood, no period, ≤72 chars
- Body: explain *why*, not *what* (the diff shows what)
- Breaking change: add `BREAKING CHANGE:` footer or `!` after type
- Co-author line added automatically on user approval

#### 5c — Present and ask for confirmation

Show the user:

1. **Files being staged** for this commit
2. **Proposed commit message** (in a code block)
3. **Progress indicator** — e.g., "Commit 1 of 3"
4. **Explicit question:**

> Shall I commit group 1/3 with this message?
> Reply **yes** to commit, **edit \<new message\>** to change the message, **skip** to skip this group, or **cancel** to abort all remaining commits.

#### 5d — Act on the user's reply

| Reply | Action |
|-------|--------|
| `yes` / `y` | Run `git commit -m "..."` with approved message + Co-Authored-By footer |
| `edit <new message>` | Use provided message instead, ask once more |
| `skip` | Skip this group, move to next |
| `cancel` / `no` | Abort all remaining commits, leave working tree as-is |

After each successful commit, show the short SHA and commit summary, then move to the next group.

### Step 6 — Final summary

After all groups are processed, show a summary:

> **Done. N commits created:**
> - `abc1234` feat(auth): add login form
> - `def5678` test(auth): add login form tests
> - `ghi9012` chore(deps): update lockfile
>
> M file(s) still have unstaged changes: [list if any]

---

## Constraints

- **Classification (Step 3) is always the first substantive action.** Never stage or commit before classifying.
- **Never merge unrelated types into one commit.** If in doubt, split.
- **Never skip the confirmation step.** Not even when the change looks trivial.
- Never use `--no-verify`. If a hook fails, report the error and ask the user how to proceed.
- Never force-push or amend a published commit.
- Never commit files that look like secrets (`.env`, credentials, private keys). Warn and exclude them.
- Stage specific files by name — never `git add -A` unless the user explicitly requests it for a group.
- If the user has already staged some files, include them in the classification and respect existing staging in the grouping proposal.

---

## Example triggers

- `/smart-commit`
- `/commit`
- "Commit my changes"
- "Help me write a commit message"
- "Stage and commit everything"
