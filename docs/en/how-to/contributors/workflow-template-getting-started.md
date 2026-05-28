---
title: Workflow Template — Getting Started
description: Contribute a community workflow template via the canonical WORKFLOW.md format. Fork, write, submit, review, merge.
---

# Workflow Template — Getting Started

This guide is for contributors adding a community workflow template — a reusable `WORKFLOW.md` file that other Lensers can fork into their own workspace. Templates live at `templates/community/` in the monorepo and are surfaced through the CLI and the workflow gallery in the web app.

The deeper guide to the SQL-seeded gallery (the legacy path) is at [Workflow Template Contribution Guide](./workflow-template-guide.md). New templates should ship as `WORKFLOW.md` files under `templates/community/` and use this getting-started guide.

## The path

1. **Fork the repository** and create a working branch.
2. **Write a WORKFLOW.md** at `templates/community/<your-slug>.workflow.md`. Use the skeleton below.
3. **Validate locally** with `lf` against the file.
4. **Submit** via `lf template submit <file>` to register it for review, or open a PR directly with the file in `templates/community/`.
5. **Review** — a maintainer (or the rotating mentor for the workflows area) reviews the PR within 7 business days.
6. **Merge** — the file lands in `templates/community/` and ships in the next release.

## The canonical WORKFLOW.md schema

The schema is defined alongside the rest of the markdown object formats in [Markdown Object Formats](../../reference/automation/markdown-objects.md). The skeleton below is the minimum a community template needs:

```markdown
---
kind: workflow
schema_version: 1
id: wf_<uuid>
slug: my-template-slug
name: My Template
description: One-sentence summary of what this template does.
owner:
  workspace_id: ws_community
visibility: public
version: 0.1.0
status: draft
workflow_type: scheduled
triggers:
  - type: schedule
steps:
  - id: plan
    type: agent_task
    agent_ref: agent_research_lead
tags:
  - community-template
---

# Purpose

What the workflow automates and the outcome a user can expect.

# Inputs

The input contract — names, defaults, validation rules.

# Steps

Ordered steps. For each: the lens or agent it binds to, expected upstream/downstream
data, retry and failure behavior.

# Outputs

Primary outputs, artifacts, and where they are written.
```

The four section headings — **Purpose**, **Inputs**, **Steps**, **Outputs** — are required. The validator rejects a `WORKFLOW.md` that is missing any of them.

## Quality bar

A community template should:

- Solve a recurring use case that more than one operator will plausibly want.
- Have a stable `id` and `slug`. Once merged, neither is renamed.
- Use lens references that exist in the public catalog or in `examples/`. Don't hard-code a private workspace's lens id.
- Stay under ~6 steps. Larger workflows are harder to fork and adapt.
- Have a single-sentence `description` that a user can read without opening the file.
- Pin `schema_version: 1`.

## Validation

Before submitting, validate the file:

```bash
lf workflow run --dry-run templates/community/<your-slug>.workflow.md
```

The dry-run loads the file, validates the frontmatter and section structure, resolves lens references, and reports what would execute — without actually running anything.

## Submission

Two paths are supported:

```bash
# Path A — submit through the CLI (registers the template for review).
lf template submit templates/community/<your-slug>.workflow.md
```

```bash
# Path B — open a PR with the file.
git add templates/community/<your-slug>.workflow.md
git commit -m "feat(templates): add <your-slug> community workflow template"
gh pr create --label good-first-workflow-template
```

Either path lands the template in the same review queue. The PR path is preferred when the template is the only change in the PR.

## Review

A workflow template PR needs:

- 1 maintainer approval (or the rotating workflows-area mentor).
- The `good-first-workflow-template` label.
- A passing dry-run on CI.

If you don't get a review within 7 business days, ping the rotation listed in [Mentor Rotation](./mentor-rotation.md).

## Related

- [Markdown Object Formats](../../reference/automation/markdown-objects.md) — full schema for `WORKFLOW.md` and friends.
- [Workflow Template Contribution Guide](./workflow-template-guide.md) — the legacy SQL-seeded gallery path.
- [Community Pilot Plan](./community-pilot-plan.md) — pilot success criteria, including the `templates/community/` count.
- Existing community templates in [`templates/community/`](../../../templates/community).
