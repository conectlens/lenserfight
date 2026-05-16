---
title: Workflow Phases
description: How phases and tasks structure a LenserFight workflow — what they are, why they matter, and how to use them effectively.
---

# Workflow Phases

A **Phase** is an ordered group of **Tasks** inside a Workflow. Phases give a workflow human-readable shape: each phase is a labelled milestone, and the tasks inside it are the concrete steps that produce that milestone's output.

Where the workflow [DAG](/en/explanation/workflows/what-is-a-dag) describes *how data flows*, phases describe *how the work is organised for the people reading, editing, and running it*.

## What a phase is

| Concept | What it is |
|---------|-----------|
| **Phase** | An ordered, named milestone inside a workflow (e.g. *Research*, *Draft*, *Review*) |
| **Task** | A single unit of work inside a phase, with a title, prompt, output type, and optional model hint |
| **Ordinal** | The position of a phase or task within its parent — determines execution and display order |
| **Output type** | What a task produces: `text`, structured data, an artifact, or media |

A workflow holds many phases. A phase holds many tasks. Tasks belong to exactly one phase and to exactly one workflow.

## Why phases matter

A flat list of nodes is hard to reason about as soon as a workflow gets non-trivial. Phases solve three problems:

1. **Readability** — a reviewer can scan *"Research → Draft → Review → Publish"* and immediately understand the shape of the workflow without inspecting every node.
2. **Editability** — owners can reorder, collapse, or delete entire stages of work in one move instead of dragging individual nodes.
3. **Reusability** — phase boundaries are natural cut points for templates. Most workflow templates ship as a sequence of well-named phases that authors then adapt.

Phases are also where the platform attaches downstream concerns: progress reporting, partial recovery, and per-phase budgets all key off the phase boundary.

## How to use phases

In the workflow editor:

- **Add a phase** with **Add Phase**. New phases append to the end with the next ordinal.
- **Rename** by clicking the title. Names are free-text — pick something a teammate could understand at a glance.
- **Reorder** with the up/down chevrons. Ordinals shift automatically.
- **Collapse** a phase to hide its tasks while you focus on another part of the workflow.
- **Delete** a phase to remove it and all its tasks. This is destructive — there is no soft-delete.

Inside a phase:

- **Add a task** with **Add Task**. The task inherits the phase's `phase_id` and gets the next ordinal in that phase.
- Each task carries a **title**, an optional **prompt**, an **output type**, and an optional **model hint**.
- Move tasks within a phase with the up/down chevrons. Moving a task across phases is done by editing the task's `phase_id` through the API.

## Phases and the DAG

Phases are an organisational layer on top of the DAG, not a replacement for it.

- Phases are **linear and ordinal-based**. Tasks inside a phase have a position, not an explicit dependency.
- The **DAG of edges** still determines actual data flow and execution order. Two tasks in the same phase can run in parallel; a task in phase 2 can depend on a task in phase 1 via an edge.
- Treat the phase order as **intent**, and the DAG as **truth**. The execution engine walks the DAG; phases just colour the picture.

When a phase has no outgoing edges to a later phase, the engine is free to overlap them — phases do not introduce synchronisation barriers on their own.

## Good phase design

A workflow with well-chosen phases reads like a table of contents.

- **One milestone per phase.** If you cannot give a phase a single short name, split it.
- **3–7 phases for most workflows.** Fewer and the structure adds no value; more and the editor becomes a list of headers.
- **Stable boundaries.** Phases should map to outputs a reviewer would want to inspect separately — e.g. *"the gathered sources"*, *"the draft"*, *"the final report"*.
- **Tasks stay small.** If a task's prompt is longer than the task title's explanation of it, consider splitting the task or promoting it to its own phase.

## Anti-patterns

- **One phase per task.** Phases lose their purpose; the editor turns into a flat list with extra chrome.
- **Mixing concerns in one phase.** A phase that contains both *"draft the article"* and *"publish the article"* hides a real boundary — split it.
- **Reordering tasks across phases without intent.** If a task keeps moving between phases, its home phase is probably wrong.

## Related

- [What is a DAG?](/en/explanation/workflows/what-is-a-dag) — The graph structure phases sit on top of
- [Workflow Concepts](/en/explanation/workflows/workflow-concepts) — Nodes, edges, runs, and the DAG model
- [Workflow Types](/en/explanation/workflows/workflow-types) — Sequential, parallel, conditional, and scheduled workflows
- [Build a Lens Chain](/en/how-to/workflows/build-a-lens-chain) — Hands-on workflow tutorial
- [Workflow Template Guide](/en/how-to/contributors/workflow-template-guide) — Authoring reusable templates
