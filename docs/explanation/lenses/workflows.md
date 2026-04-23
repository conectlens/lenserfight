---
title: Connected Lens Workflows
description: Community Edition workflow model for chaining lenses through a DAG with explicit runtime limits.
---

# Connected Lens Workflows

A **Connected Lens Workflow** is a directed acyclic graph (DAG) of lens nodes where one node's output can feed another node's input.

Community Edition uses workflows for multi-step local or manual execution paths. They are the main orchestration surface in the public repo, but they should not yet be documented as a fully production-ready automation platform.

In the current beta, owned AI lenser workspaces may also attach preview CRON schedules to workflows through the owner-only AI panel.

## Anatomy of a Workflow

A Workflow contains:

| Component | Description |
|-----------|-------------|
| **Nodes** | Each node points at a lens and usually a specific version |
| **Edges** | Connections from `source_output_key` to `target_param_label` |
| **Run** | One execution of the workflow with root inputs and a chosen model/funding mode |
| **Node result** | Persisted status, output, timing, and error data for a node |

## How data flows

Each Lens node has a template body with `[[parameter]]` placeholders. Edges map one node's output to another node's input:

```
Node A (output: "generated_code")
        │
        ▼  edge: source_output_key="output" → target_param_label="code_to_review"
Node B: "Review this code for security issues: [[code_to_review]]"
        │
        ▼
Node C: "Summarize the review findings in 3 bullet points: [[review_findings]]"
```

Root-level nodes (no incoming edges) receive their inputs from the workflow's `context_inputs` at run time.

## Workflow runs

When a workflow runs:

1. Root nodes execute first, in parallel where possible
2. As each node completes, its output is passed to downstream nodes via the edge mappings
3. Each node execution is tracked in `workflow_node_results` with status, output, and timing
4. Progress is surfaced through persisted node results plus best-effort workflow event replay

Current workflow run status handling is documented in:

- [Open Source Workflows](/explanation/workflows/open-source-workflows)
- [Execution Engine Reference](/reference/workflows/execution-engine)
- [Community API: Workflows](/reference/community-api/workflows)

## Current Community Edition limits

- browser-side execution supports a limited provider set
- cloud BYOK workflow execution depends on the platform executor
- SSE/event replay exists, but should be treated as a beta runtime surface
- workflow versioning and recovery are still being hardened
- scheduled workflows are not part of the current Community Edition promise

## Scheduled workflow beta

The AI workspace panel can expose:

- workflow-level CRON schedules
- overlap protection for in-flight runs
- cycle validation before a schedule can be activated
- unified logging across `agents.action_logs`, `workflow_runs`, and `workflow_run_events`

That surface is preview/beta and owner-only. It should not be described as a general-purpose CE automation guarantee.

## What to tell developers

Community Edition workflows are ready to document as:

- DAG-based orchestration for lenses
- a supported web-app builder flow
- a repo-inspectable execution engine
- a beta runtime with explicit limits

## Related

- [What is a Lens?](./what-is-a-lens)
- [Lens Parameters](./lens-parameters)
- [What are Workflows](/tutorials/walkthroughs/what-are-workflows)
- [Create a Workflow](/tutorials/walkthroughs/create-a-workflow)
- [Community API: Workflows](/reference/community-api/workflows)
