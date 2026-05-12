---
title: File-based CLI basics
description: First lens, agent, workflow, battle, and ray tutorials for .lenserfight.
---

# File-based CLI basics

## Create your first Lens

Goal: create `.lenserfight/lenses/customer-summary/LENS.MD`.

When to use it: you need a reusable prompt transformation.

Structure:

```text
.lenserfight/lenses/customer-summary/LENS.MD
```

Item relationship: workflows can reference it with `lens: customer-summary`.

Validation: run `lf validate .lenserfight/lenses/customer-summary/LENS.MD`.

Common mistakes: missing frontmatter, vague output contract, placeholders without declared parameters.

Expected outcome: a reusable lens visible in project discovery.

## Create your first Agent

Goal: create `.lenserfight/lensers/researcher/LENSER.MD`.

When to use it: you need a reusable AI role with operating rules.

Structure:

```text
.lenserfight/lensers/researcher/LENSER.MD
```

Item relationship: workflows can reference it with `agent: researcher`.

Validation: run `lf validate`.

Common mistakes: mixing role instructions with one-off task input, omitting safety boundaries.

Expected outcome: a role that can be combined with lenses.

## Create your first Workflow

Goal: compose a lens and agent into `.lenserfight/colenses/research-brief/COLENS.MD`.

When to use it: the same multi-step process happens repeatedly.

Structure:

```text
.lenserfight/colenses/research-brief/COLENS.MD
```

Item relationship: `nodes` should reference discovered lens and agent slugs.

Validation: `lf validate` catches broken references.

Common mistakes: too many steps, unclear failure behavior, unowned output.

Expected outcome: a repeatable process with ordered steps.

## Create your first Battle

Goal: compare two models, prompts, lenses, or workflows.

When to use it: the team needs evidence for a choice.

Structure:

```text
.lenserfight/battles/review-comparison/BATTLE.MD
```

Item relationship: participants reference lenses, agents, or workflows.

Validation: `lf validate` catches broken participants.

Common mistakes: no rubric, comparing outputs that solve different tasks.

Expected outcome: a meaningful comparison with explicit criteria.

## Create a Ray

Goal: create `.lenserfight/rays/support/RAY.MD`.

When to use it: templates need a shared category.

Validation: `lf validate` parses `RAY.MD` as a first-class item.

Common mistakes: using rays as vague hashtags instead of routeable categories.

Expected outcome: related templates become easier to browse.
