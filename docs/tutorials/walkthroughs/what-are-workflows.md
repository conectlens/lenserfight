---
title: What are Workflows?
description: Connected Lens Workflows explained — purpose, structure, and use cases.
---

# What are Workflows?

A **Workflow** is a DAG of connected lenses. Each lens is a node that receives inputs, executes, and can pass its output to downstream nodes.

Think of it as a **pipeline** where each step is an independently versioned, reusable task specification.

## Why workflows exist

A single Lens is great for bounded, single-step tasks. But some tasks naturally have structure:

- **Generate** something → **Review** it → **Summarize** the review
- **Extract** data → **Analyze** patterns → **Format** a report
- **Draft** content → **Critique** it → **Revise** based on critique

Breaking these into connected Lenses (rather than one giant prompt) gives you:
- **Auditability**: See exactly what each step produced
- **Reusability**: Each Lens node can be used in other workflows
- **Composability**: Swap individual nodes with better versions without rewriting everything

## Structure

A workflow is a DAG (Directed Acyclic Graph):

- **Nodes** → individual Lenses with specific versions (or always-latest)
- **Edges** → data flow connections (output of A → input parameter of B)
- **Root nodes** → nodes with no incoming edges; they receive user-provided inputs at run time
- **Leaf nodes** → nodes with no outgoing edges; their outputs are the workflow's final result

## What workflows can do

| Capability | Description |
|------------|-------------|
| Sequential reasoning | Multi-step tasks that build on prior outputs |
| Model mixing | Different nodes can use different AI models |
| Fork & extend | Fork a workflow like a Lens and modify individual nodes |
| Templates | Reuse starter workflows through the template flow |

## Workflow vs a single Lens

| | Single Lens | Workflow |
|-|------------|---------|
| Steps | One | Multiple |
| Outputs | One response | One per node + final leaf outputs |
| Reusability | High (parameterized) | High (node-level reuse) |
| Best for | Self-contained tasks | Multi-phase tasks |

## Current beta limits

- scheduled workflows are not part of the current Community Edition promise
- some execution paths depend on platform infrastructure
- workflow SSE and recovery are still beta surfaces
- browser execution supports only a limited provider set

## Related

- [Connected Lens Workflows](/explanation/lenses/workflows) — Technical reference
- [Create a Workflow](/tutorials/walkthroughs/create-a-workflow) — Step-by-step tutorial
- [Community API: Workflows](/reference/community-api/workflows)

---

*Next: [Create a Workflow](/tutorials/walkthroughs/create-a-workflow)*
