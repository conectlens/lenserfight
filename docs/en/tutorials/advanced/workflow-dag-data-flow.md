---
title: Workflow DAG Data Flow
description: Understand and use upstream node outputs in multi-step workflow pipelines — connecting nodes, mapping parameters, and building real DAG data flows.
head:
  - - meta
    - name: og:title
      content: Workflow DAG Data Flow — LenserFight Advanced
  - - meta
    - name: og:description
      content: Learn how data flows between workflow nodes in LenserFight — upstream outputs, edge mappings, variable scopes, and branching patterns.
---

# Workflow DAG Data Flow

## Goal

Build a multi-step workflow where each node's output is the input for the next, using explicit edge mappings — the same pattern as n8n or Temporal DAGs.

By the end of this tutorial you will have a three-node pipeline that generates code, reviews it, and summarizes the findings — with each node feeding its output to the next automatically.

---

## Prerequisites

- [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow) completed
- At least two published Lenses you can chain together
- Local instance running (`pnpm nx run web:serve`) or access to the platform

---

## Expected Result

A workflow where:

1. **Node 1** generates a Python function given a spec input
2. **Node 2** receives Node 1's output automatically as its `code_to_review` parameter
3. **Node 3** receives Node 2's output automatically as its `review_findings` parameter
4. Running the workflow once produces all three outputs in a single execution

---

## How Data Flows Between Nodes

Every node in a workflow produces a structured output envelope when it completes:

```
NodeOutputEnvelope {
  nodeId:    "uuid-of-this-node"
  mediaType: "text" | "image" | "json" | ...
  text?:     "the generated text"
  data?:     { ... structured object ... }
  durationMs: 1240
}
```

An **edge** connects one node's output to another node's input parameter. The edge specifies:

| Field | Meaning |
|-------|---------|
| `sourceNodeId` | Which node produced the value |
| `sourceOutputKey` | Which field of the output to use (`text`, `data.someField`, etc.) |
| `targetNodeId` | Which node will receive it |
| `targetParamKey` | Which `[[parameter_name]]` in the target Lens gets this value |

When the execution engine runs Node 2, it resolves all incoming edges first, looks up each source node's completed output, and injects the values into the target parameters before calling the model.

---

## Steps

### 1. Create the three Lenses

Create three Lenses from the Lens library. Each has one `[[parameter]]` that will be wired by an edge.

**Lens A — Code Generator**

Title: `Generate Python Function`

Template:
```
Write a Python function that implements the following specification.
Include a docstring and type hints.

Specification:
[[spec]]
```

Parameters: `spec` (string, required)

Publish it.

**Lens B — Code Reviewer**

Title: `Review Python Code`

Template:
```
Review the following Python code for correctness, edge cases, and style.
List issues as numbered bullet points. Be specific.

Code to review:
[[code_to_review]]
```

Parameters: `code_to_review` (string, required)

Publish it.

**Lens C — Review Summarizer**

Title: `Summarize Review Findings`

Template:
```
Summarize the following code review findings into 3 actionable bullet points.
Each bullet must be a concrete, implementable change.

Review findings:
[[review_findings]]
```

Parameters: `review_findings` (string, required)

Publish it.

---

### 2. Create the Workflow

Navigate to **Workflows → Create Workflow**.

Add three nodes to the canvas:

| Node | Lens | Label |
|------|------|-------|
| Node 1 | Generate Python Function | "Generate" |
| Node 2 | Review Python Code | "Review" |
| Node 3 | Summarize Review Findings | "Summarize" |

Position them left-to-right. They are not yet connected.

---

### 3. Draw the edges

**Edge 1: Generate → Review**

Click the output handle on Node 1 and drag to the input handle on Node 2. A dialog opens:

- **Source output key**: `text` (the default — the model's generated text)
- **Target parameter**: `code_to_review`

Confirm. An arrow appears from Node 1 to Node 2.

**Edge 2: Review → Summarize**

Click the output handle on Node 2 and drag to the input handle on Node 3:

- **Source output key**: `text`
- **Target parameter**: `review_findings`

Confirm.

Your canvas now shows a linear pipeline:

```
[Generate] --text→ code_to_review--> [Review] --text→ review_findings--> [Summarize]
```

---

### 4. Set the root input

Node 1 (`Generate`) has a `spec` parameter with no incoming edge. This makes it a **root input** — the user must supply it at run time.

In the node config panel for Node 1, set a default value for `spec` or leave it blank to prompt at runtime.

---

### 5. Run the workflow

Click **Run**. The platform shows the root input form:

```
spec: [_____________________________]
```

Enter a spec, e.g.:

```
Parse a CSV file line by line. Handle empty files and malformed rows.
Return a list of dicts where each key is a column header.
```

Click **Execute Run**. Watch:

1. Node 1 status: `pending` → `running` → `completed`
2. Node 2 starts automatically with Node 1's text injected into `code_to_review`
3. Node 3 starts automatically with Node 2's text injected into `review_findings`

---

## Verify It Works

Open the Run Results panel after completion. You should see:

- **Node 1 output**: A Python function with a docstring
- **Node 2 output**: A numbered review list for that specific function
- **Node 3 output**: Three actionable bullet points referencing specific issues from the review

If Node 2's output references the same code that Node 1 generated, the wiring is working correctly.

---

## Output Key Reference

The `sourceOutputKey` you specify in an edge supports dot-path notation into the output envelope:

| Key | What it resolves to |
|-----|---------------------|
| `text` | The main generated text (most common) |
| `data` | The full structured data object |
| `data.someField` | A specific field within the structured data |
| `data.items[0]` | First element of an array in the data |

For Lens nodes, `text` is almost always the right key. For structured nodes (JSON transform, code execution, etc.) use `data` or a dot-path into it.

---

## Variable Scope

In addition to edge-connected values, the execution engine maintains a **workflow-scoped variable map**. This is how some node types share data without direct edges:

- **Root inputs** (parameters on nodes with no incoming edges) are placed into the variable map at run start.
- **SetVariables nodes** can write new entries to the map, available to all downstream nodes.
- **Edge-injected values** take precedence over variable map values when both exist for the same parameter name.

This means a deeply nested node can still reference a root input by name without needing an explicit edge chain through every intermediate node.

---

## Branching Patterns

DAG workflows are not limited to linear chains. Two useful patterns:

**Fan-out**: One node feeds multiple downstream nodes simultaneously.

```
[Generate] → [Reviewer A]
           → [Reviewer B]
```

Both reviewers receive the same generated text. The execution engine runs them in parallel.

**Fan-in**: Multiple nodes feed one downstream node.

```
[Reviewer A] →
               [Aggregator]
[Reviewer B] →
```

The Aggregator node has two incoming edges on different parameters (`review_a` and `review_b`). The engine waits for both upstream nodes to complete before starting the Aggregator.

To build a fan-in, draw two edges to the same target node — one from each source — and map them to distinct target parameters.

---

## Common Issues

### Issue: Node 2 runs with an empty parameter

**Cause**: The edge `targetParamKey` does not match the `[[parameter_name]]` exactly (case-sensitive).

**Fix**: Check that the edge's target param key is spelled identically to the `[[parameter_name]]` in the Lens template. Parameter names are case-sensitive — `code_to_review` and `Code_To_Review` are different.

---

### Issue: Node starts before its upstream node finishes

**Cause**: No edge was drawn between the nodes, so the engine treats them as independent.

**Fix**: Add the missing edge. Without an edge, the engine has no dependency information and may run nodes in any order (or in parallel).

---

### Issue: `data.someField` resolves to undefined

**Cause**: The upstream node produced a `text` output, not a structured `data` object.

**Fix**: Use `text` as the source key. Only structured runner types (JSON transform, code node, etc.) populate `data`.

---

### Issue: Root inputs do not appear in the run form

**Cause**: All parameters on Node 1 have incoming edges, leaving no free parameters.

**Fix**: A parameter is a root input only if it has no incoming edge. Remove the edge on the parameter you want the user to provide.

---

## Related Docs

- [What is a DAG?](/en/explanation/workflows/what-is-a-dag)
- [Workflow Concepts](/en/explanation/workflows/workflow-concepts)
- [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow)
- [Contributing a Workflow Node](/en/how-to/contributors/workflow-node-contribution-guide)
- [Workflow Node Catalog](/en/reference/workflows/workflow-node-catalog)

---

## Next Steps

- [Agent Orchestration](/en/tutorials/advanced/agent-orchestration) — multi-agent teams and autonomous execution
- [Writing Tests for a Feature](/en/tutorials/advanced/writing-tests-for-a-feature) — test your workflow nodes
- [Workflow Battle](/en/tutorials/battle-walkthroughs/workflow-battle) — pit two workflow pipelines against each other
