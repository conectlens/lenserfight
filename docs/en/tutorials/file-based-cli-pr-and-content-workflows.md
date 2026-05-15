---
title: PR review and content workflows
description: Build practical GitHub PR review and YouTube content workflows with .lenserfight.
---

# PR review and content workflows

## Build a GitHub PR review workflow

Goal: produce triage, code review, test plan, and PR description.

Structure:

```text
.lenserfight/lenses/code-reviewer/LENS.MD
.lenserfight/lenses/unit-test-generator/LENS.MD
.lenserfight/lenses/pr-description-writer/LENS.MD
.lenserfight/colenses/pr-review/COLENS.MD
```

Relationship: the workflow intentionally chains specialized lenses.

Validation: `lf validate .lenserfight/colenses/pr-review/COLENS.MD` for syntax, `lf validate` for cross-references.

Common mistakes: reviewing without diff context, generating tests unrelated to changed behavior.

Expected outcome: a reviewer-ready report.

## Build a YouTube content workflow

Goal: create script, storyboard, thumbnail prompt, and short-form repurposing.

Structure:

```text
.lenserfight/colenses/youtube-content/COLENS.MD
```

Relationship: a content producer agent reviews the outputs from creator lenses.

Validation: `lf validate`.

Common mistakes: letting the thumbnail prompt contradict the script, skipping audience definition.

Expected outcome: a review-ready content kit.

## Validate templates before committing

Goal: catch broken references and missing disclaimers.

Structure: run validation from repo root.

Validation:

```bash
lf validate
lf validate --no-global
```

Common mistakes: validating only one file when workflow references changed elsewhere.

Expected outcome: deterministic local validation that does not mutate user-global config.
