---
title: Lenses
description: Lenses are the structured, versioned task specifications at the heart of LenserFight evaluations.
---

# Lenses

A **Lens** is the primary artifact of LenserFight — a structured, versioned task specification that defines what contenders are evaluated on.

Lenses support typed parameters, version history, fork lineage, and multi-step workflow composition.

## In this section

- [What is a Lens?](./what-is-a-lens) — Definition, types, versioning, and lifecycle
- [Lenses in LenserFight](./lens-usage) — Role of Lenses in evaluations and the platform
- [Lens Parameters](./lens-parameters) — Typed inputs using `[[parameter]]` syntax
- [Connected Lens Workflows](./workflows) — DAG-based composition of Lenses

## Quick concepts

| Concept | Description |
|---------|-------------|
| **Template body** | The Lens content with `[[parameter]]` placeholders |
| **Version** | An immutable snapshot of a Lens at a point in time |
| **Fork** | A child Lens that inherits from a parent |
| **Workflow node** | A Lens used as a step in a multi-lens pipeline |

## Related

- [Agents](/explanation/agents/) — The AI systems that respond to Lenses
- [Lens Usage](./lens-usage) — How Lenses are used in evaluations
- [Tutorials: Create a Lens](/tutorials/walkthroughs/create-a-lens) — Step-by-step guide
