---
title: Create a Workflow
description: Connect triggers, Lenses, and tools into a workflow and map outputs to downstream inputs.
---

# Create a Workflow

A Workflow connects a trigger, reusable Lenses, and deterministic tools into a pipeline. A node's output can supply a downstream node's input parameter.

## When to use a workflow

Use a workflow when:

- The task requires multiple sequential reasoning steps
- An output from one model call must be the input for the next
- You need a trigger or deterministic tool around reusable AI instructions
- You want to chain independent, reusable Lenses rather than write a single complex prompt

## Step 1: Plan your pipeline

Sketch the flow before building it. You can click **Workflow Instructions** in the canvas toolbar to copy a structured planning prompt into an AI assistant. The prompt requires a usable trigger, Lens, tool, parameter, and connection plan without inventing internal IDs or unavailable nodes.

For example, a "Code Review" workflow:

```
1. Generate code for [[spec]]
        ↓
2. Review code for [[code_to_review]] — identify issues
        ↓
3. Summarize [[review_findings]] into actionable bullet points
```

Identify:

- Root inputs (what the user provides at run time)
- Which output flows to which input
- Which steps require AI reasoning and which should use deterministic tools

## Step 2: Create (or select) each Lens node

Each step in your workflow should be an existing published Lens, or you can create new ones specifically for this workflow.

For the example above:

- **Node 1 Lens**: `Generate code for the following specification: [[spec]]`
- **Node 2 Lens**: `Review this code for correctness, edge cases, and style: [[code_to_review]]`
- **Node 3 Lens**: `Summarize these review findings in 3 actionable bullet points: [[review_findings]]`

## Step 3: Open the Workflow builder

Navigate to your profile and click **Create Workflow**. The visual workflow editor opens on a blank canvas.

## Step 4: Add nodes

Drag nodes from the palette onto the canvas:

- Add one trigger, such as **Manual Trigger**, **Schedule Trigger**, or **Webhook Trigger**
- Add Lenses for research, generation, analysis, and other AI-driven work
- Add tools for deterministic logic, routing, data operations, and integrations
- Pin a specific version (e.g., `v3`) or leave it as "latest published"
- Add a display label for clarity

## Step 5: Draw edges

Connect node outputs to node inputs by drawing edges between them. For each edge, specify:

- **Source output key** — usually `output` (the default node output)
- **Target parameter label** — the `[[parameter_name]]` in the target Lens that should receive this value

Example edge: Node 1 → Node 2:

- Source output key: `output`
- Target parameter label: `code_to_review`

Dragging an upstream output onto an input creates the same mapping. The input is marked as automatically supplied, so the user is not asked to enter it again.

## Step 6: Fill Lens parameters

Select a Lens node to open its configuration panel. Parameters not supplied by an upstream connection can be entered individually or filled in bulk:

- Click **Import JSON** to paste an object whose keys match the Lens parameter labels
- Click **Import CSV** to paste a header row and one values row
- Use the dialog's template copy action to get the exact expected field names
- When AI generation is available, generate values using the Lens title, instructions, and parameter schema

Boolean and multi-select parameters retain their field types after import. Imported values are still editable before you click **Save Config**.

## Step 7: Set visibility and save

Like Lenses, Workflows can be `public`, `unlisted`, or `private`. Set visibility and click **Save**.

## Step 8: Run the workflow

Click **Run** to execute the workflow. Provide the root-level inputs (the parameters on root nodes that have no incoming edges). Root Lens inputs also support **Import JSON** and **Import CSV** before execution. The platform executes nodes in dependency order.

Watch node statuses update in real time: `pending` → `running` → `completed`.

## Step 9: Review results

Each node's output is shown in the run results panel. The final leaf-node outputs are the workflow's overall output.

## Use in a workflow evaluation

Workflows can be used as the basis for evaluations, allowing teams to compare multi-step pipeline outputs.

## Related

- [Connected Lens Workflows](/en/explanation/lenses/workflows)
- [What is a Lens?](/en/explanation/lenses/what-is-a-lens)
- [What are Workflows](/en/tutorials/walkthroughs/what-are-workflows)

---

_Next: [What are Workflows](/en/tutorials/walkthroughs/what-are-workflows)_
