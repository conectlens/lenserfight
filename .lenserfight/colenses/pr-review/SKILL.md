---
name: pr-review
description: From diff to reviewer-ready summary — analyze, review, surface risks, draft PR description.
---

# Pull Request Review Colens

A 4-node developer colens that takes a diff and produces a complete reviewer-ready report: a triage placement, a code review, suggested tests, and a clean PR description.

## Suggested usage

Run via Chainabit's PR webhook integration or directly from the colens page. Inputs are the diff summary and the engineering goals of the current sprint.

## Forkability

This colens is intentionally forkable. Teams routinely:

- Drop the `tests` node when the diff is a doc-only change.
- Add a `validate-output` node after `describe` to enforce a house PR template.
- Replace `code-reviewer` with a language-specific reviewer fork.
