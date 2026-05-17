---
name: github
title: GitHub
description: GitHub-centric templates — pull requests, issue triage, repo automation.
visibility: public
route: /ray/github
---

# `#github`

Templates that operate on GitHub artifacts — pull requests, issues, commits, releases.

## Public lenses

- [`code-reviewer`](../../lenses/code-reviewer/LENS.MD) — review a diff
- [`github-issue-solver`](../../lenses/github-issue-solver/LENS.MD) — root cause, fix plan, test plan, and PR draft for a single issue
- [`github-issue-triage`](../../lenses/github-issue-triage/LENS.MD) — classify and prioritize an issue
- [`pr-description-writer`](../../lenses/pr-description-writer/LENS.MD) — write a PR body
- [`pr-triage-brief`](../../lenses/pr-triage-brief/LENS.MD) — triage a review queue

## Public workflows

- [`github-issue-solver`](../../colenses/github-issue-solver/COLENS.MD) — end-to-end: triage → analyze → tests → review → PR
- [`pr-review`](../../colenses/pr-review/COLENS.MD)

## Public lensers

- [`issue-solver`](../../lensers/issue-solver/LENSER.MD) — autonomous agent: fetch issue → implement → test → PR → merge → close

## Public battles

- [`claude-vs-openai-pr-review`](../../battles/claude-vs-openai-pr-review/BATTLE.MD)
