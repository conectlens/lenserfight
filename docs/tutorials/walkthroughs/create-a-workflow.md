---
title: Create a Workflow
description: Chain multiple Lenses into a connected workflow where each node's output feeds the next.
---

# Create a Workflow

A Workflow connects multiple Lenses into a pipeline. Each node executes a Lens, and the output flows to the next node as an input parameter.

## When to use a workflow

Use a workflow when:
- The task requires multiple sequential reasoning steps
- An output from one model call must be the input for the next
- You want to chain independent, reusable Lenses rather than write a single complex prompt

## Step 1: Plan your pipeline

Sketch the flow before building it. For example, a "Code Review" workflow:

```
1. Generate code for [[spec]]
        ↓
2. Review code for [[code_to_review]] — identify issues
        ↓
3. Summarize [[review_findings]] into actionable bullet points
```

Each step is a separate Lens. Identify:
- Root inputs (what the user provides at run time)
- Which output flows to which input

## Step 2: Create (or select) each Lens node

Each step in your workflow should be an existing published Lens, or you can create new ones specifically for this workflow.

For the example above:
- **Node 1 Lens**: `Generate code for the following specification: [[spec]]`
- **Node 2 Lens**: `Review this code for correctness, edge cases, and style: [[code_to_review]]`
- **Node 3 Lens**: `Summarize these review findings in 3 actionable bullet points: [[review_findings]]`

## Step 3: Open the Workflow builder

Navigate to your profile and click **Create Workflow**. The visual workflow editor opens on a blank canvas.

## Step 4: Add nodes

Drag Lens cards onto the canvas. Each card represents one Lens node. You can:
- Pin a specific version (e.g., `v3`) or leave it as "latest published"
- Add a display label for clarity

## Step 5: Draw edges

Connect node outputs to node inputs by drawing edges between them. For each edge, specify:
- **Source output key** — usually `output` (the default node output)
- **Target parameter label** — the `[[parameter_name]]` in the target Lens that should receive this value

Example edge: Node 1 → Node 2:
- Source output key: `output`
- Target parameter label: `code_to_review`

## Step 6: Set visibility and save

Like Lenses, Workflows can be `public`, `unlisted`, or `private`. Set visibility and click **Save**.

## Step 7: Run the workflow

Click **Run** to execute the workflow. Provide the root-level inputs (the parameters on root nodes that have no incoming edges). The platform executes nodes in dependency order.

Watch node statuses update in real time: `pending` → `running` → `completed`.

## Step 8: Review results

Each node's output is shown in the run results panel. The final leaf-node outputs are the workflow's overall output.

## Use in a workflow battle

To pit two workflows against each other in a `workflow_battle`, see [Battle with Workflows](/tutorials/walkthroughs/battle-with-workflows).

## Related

- [Connected Lens Workflows](/explanation/lenses/workflows)
- [What is a Lens?](/explanation/lenses/what-is-a-lens)
- [Battle with Workflows](/tutorials/walkthroughs/battle-with-workflows)

---

*Next: [Battle with Lenses](/tutorials/walkthroughs/battle-with-lenses)*
