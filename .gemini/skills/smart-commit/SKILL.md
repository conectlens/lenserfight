---
name: smart-commit
description: Detect staged and unstaged git changes, classify them by type (feat/fix/refactor/docs/chore/test/style/perf), draft a conventional commit message, then ask the user for approval before committing. Use when the user wants to commit their current work, wants help writing a commit message, or says /commit or /smart-commit.
---

# Smart Commit

Inspect the working tree, classify every change, propose a commit message, and wait for explicit user approval before running `git commit`.

**Never commit without user confirmation.**

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

### Step 2 — Read the diff content

```bash
# Staged changes (will be in next commit)
git diff --cached

# Unstaged changes (not yet staged)
git diff
```

Skim hunks to understand *what* changed, not just *which* files.

### Step 3 — Classify changes

Map each file or logical group to one of these conventional-commit types:

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

One commit may cover multiple types; choose the dominant one for the header. List secondary types in the body if significant.

Use scope when the change is scoped to a single app/lib (e.g. `feat(auth)`, `fix(api)`, `chore(deps)`).

### Step 4 — Detect unstaged changes

If there are **unstaged** changes alongside staged ones, flag them explicitly:

> ⚠️ The following files have unstaged changes that will **not** be included:
> - `path/to/file.ts` — [brief reason]
>
> Do you want to stage them too, or commit only the staged portion?

Wait for the user's answer before continuing.

### Step 5 — Draft the commit message

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

### Step 6 — Present and ask for confirmation

Show the user:

1. **Change summary table** — file, type, brief description
2. **Proposed commit message** (in a code block)
3. **Explicit question** — one of:

> Shall I commit these changes with the message above?
> Reply **yes** to proceed, **edit** to change the message, **stage-all** to also stage unstaged files first, or **cancel** to abort.

### Step 7 — Act on the user's reply

| Reply | Action |
|-------|--------|
| `yes` / `y` | Run `git commit -m "..."` with the approved message + Co-Authored-By footer |
| `edit <new message>` | Use the provided message instead, then ask once more |
| `stage-all` | Run `git add -A`, then return to Step 5 with refreshed diff |
| `stage <file>` | Run `git add <file>`, then return to Step 5 |
| `cancel` / `no` | Abort — do not commit anything |

After a successful commit, show the short SHA and the first line of the commit message.

---

## Constraints

- **Never skip the confirmation step.** Not even when the change looks trivial.
- Never use `--no-verify`. If a hook fails, report the error and ask the user how to proceed.
- Never force-push or amend a published commit.
- Never commit files that look like secrets (`.env`, credentials, private keys). Warn and exclude them.
- Prefer staging specific files by name over `git add -A` unless the user explicitly asks.

---

## Example triggers

- `/smart-commit`
- `/commit`
- "Commit my changes"
- "Help me write a commit message"
- "Stage and commit everything"
