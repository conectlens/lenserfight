---
name: smart-commit
title: Smart Commit
description: Inspect the working tree, classify every change by conventional-commit type, group into logical commit units, and commit each group separately with explicit user approval. Never merges unrelated changes into one commit.
author: '@lenserfight'
visibility: public
forkable: true
inputs:
  - label: instructions
    tool: textarea
    required: false
    example: "Keep DB migration in its own commit. Skip lockfile changes."
outputs:
  kind: text
rays: [developer, productivity]
---

# Smart Commit

Inspect the working tree and commit changes in logical groups. Apply `[[instructions]]` when provided.

**Never commit without user confirmation. Never lump unrelated changes into one commit.**

---

## Step 1 — Snapshot the working tree

```bash
git status --short
git diff --stat HEAD
git diff --cached --stat
```

If both staged and unstaged areas are empty, report nothing to commit and stop.

## Step 2 — Read the full diff

```bash
git diff --cached
git diff
```

Skim hunks to understand *what* changed, not just *which* files. Both staged and unstaged are candidates.

## Step 3 — Classify ALL changes (required before any staging)

Map every changed file to a conventional-commit type:

| Type | When to use |
|------|-------------|
| `feat` | New user-visible feature or capability |
| `fix` | Bug fix or incorrect behavior corrected |
| `refactor` | Code restructuring with no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests only |
| `docs` | Documentation, comments, README only |
| `style` | Formatting, whitespace, lint — no logic change |
| `chore` | Build scripts, deps, tooling, config |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverts a previous commit |

Output a **classification table** before proceeding:

| File | Status | Type | Scope | Brief description |
|------|--------|------|-------|-------------------|

## Step 4 — Group into logical commit units

Rules:
- Same type + same scope → one commit candidate
- Different types → separate commits
- Unrelated features in the same type → separate commits
- A feat that also touches tests → two commits (`feat` + `test`) unless inseparable
- Mechanical changes (style, chore, docs) never bundled with feat/fix

Present the proposed grouping and ask:

> Does this grouping look right? Reply **yes** to proceed, **regroup \<instructions\>** to adjust, or **cancel** to abort.

## Step 5 — Handle each group, one at a time

For each group:

**5a** — Stage only the files for this group:
```bash
git add path/to/file1 path/to/file2
```
Never `git add -A` or `git add .` unless explicitly requested.

**5b** — Draft the commit message (Conventional Commits v1.0):
```
<type>(<scope>): <imperative summary, ≤72 chars>

<optional body: why, not what>

<optional footer: BREAKING CHANGE, Closes #issue>
```

**5c** — Show files, proposed message, and progress (e.g. "Commit 1 of 3"), then ask:

> Shall I commit group 1/3? Reply **yes**, **edit \<new message\>**, **skip**, or **cancel**.

**5d** — Act on reply:

| Reply | Action |
|-------|--------|
| `yes` | `git commit -m "..."` + Co-Authored-By footer |
| `edit <msg>` | Use provided message, ask once more |
| `skip` | Skip group, move to next |
| `cancel` | Abort all remaining commits |

## Step 6 — Final summary

```
Done. N commits created:
- <sha> <message>
- <sha> <message>

M file(s) still have unstaged changes: [list if any]
```

---

## Constraints

- Classification (Step 3) is always the first substantive action.
- Never merge unrelated types into one commit.
- Never skip the confirmation step, even for trivial changes.
- Never use `--no-verify`. If a hook fails, report and ask how to proceed.
- Never commit `.env`, credentials, or private keys — warn and exclude them.
