---
name: pr-review
title: Pull Request Review Colens
description: From diff to reviewer-ready summary — analyze, review, surface risks, draft PR description.
author: '@lenserfight'
visibility: public
forkable: true
nodes:
  - id: triage
    lens: pr-triage-brief
    note: Where does this PR sit in the queue.
  - id: review
    lens: code-reviewer
    inputs_from: triage
  - id: tests
    lens: unit-test-generator
    inputs_from: review
    note: Suggest test cases for behaviour the diff introduces.
  - id: describe
    lens: pr-description-writer
    inputs_from: review
outputs:
  kind: text
rays: [github, developer, colens, template]
seed_uuid: 48000000-0002-0006-0001-000000000001
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
