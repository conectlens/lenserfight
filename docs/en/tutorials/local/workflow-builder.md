---
title: Local Workflow Builder
description: Build, test, and debug workflows in the local canvas — React Flow, custom nodes, and execution debugging.
head:
  - - meta
    - name: og:title
      content: Local Workflow Builder — LenserFight
  - - meta
    - name: og:description
      content: Create and debug DAG workflows in the LenserFight canvas with React Flow.
---

# Local Workflow Builder

This tutorial teaches you to build, connect, execute, and debug workflows in the LenserFight visual canvas. Workflows are DAGs (directed acyclic graphs) where each node executes a Lens and passes its output to connected downstream nodes.

## Prerequisites

- [Local Installation](/en/tutorials/local/installation) completed
- Web app running at `http://localhost:3000`
- At least one published Lens

---

## Canvas architecture

The workflow builder is powered by [React Flow](https://reactflow.dev/) and renders inside the web app at `/workflows/new` or `/workflows/<id>/edit`.

```
Canvas Layer (React Flow)
  ├── Viewport         → pan, zoom, minimap
  ├── Node Layer       → Lens nodes, start/end markers
  ├── Edge Layer       → directed connections between nodes
  ├── Controls         → zoom buttons, fit-to-view, lock
  └── Background       → infinite dot grid
```

### Key components

| Component | Location | Purpose |
|-----------|----------|---------|
| `WorkflowCanvas` | `libs/features/workflows/` | Main canvas container |
| `LensNode` | `libs/features/workflows/` | Custom node for Lens execution |
| `EdgeConnection` | `libs/features/workflows/` | Typed edge between nodes |
| `NodeInspector` | `libs/features/workflows/` | Right-panel node detail editor |
| `WorkflowToolbar` | `libs/features/workflows/` | Top toolbar (save, run, settings) |

---

## Step 1 — Create a new workflow

### Via the web app

1. Navigate to your profile or dashboard
2. Click **Create Workflow**
3. The blank canvas opens with an infinite grid

### Via the CLI

```bash
lf workflow create --name "Research Pipeline"
```

---

## Step 2 — Add nodes

### Drag from the Lens picker

1. Open the Lens picker panel (left sidebar)
2. Drag a Lens card onto the canvas
3. The node appears with the Lens name, inputs, and output port

### Node properties

Each node has:

| Property | Description |
|----------|-------------|
| **Lens** | The Lens this node executes |
| **Version** | Pinned version or `latest` |
| **Label** | Display name on the canvas |
| **Input ports** | Parameters from the Lens template (`[[param]]`) |
| **Output port** | The execution output passed downstream |

---

## Step 3 — Connect nodes

### Drawing edges

1. Click the **output handle** (right side) of the source node
2. Drag to the **input handle** (left side) of the target node
3. An edge appears with a mapping dialog

### Edge mapping

Each edge maps a source output to a target parameter:

```
Node A (output: "output")  →  Node B (input: "code_to_review")
```

The mapping tells the runtime: "Take Node A's output and inject it as `[[code_to_review]]` in Node B's Lens template."

### Validation rules

- **No cycles** — the graph must be a DAG
- **No dangling inputs** — every required input must have an edge or a root-level parameter
- **Type compatibility** — edges respect declared parameter types

---

## Step 4 — Configure root inputs

Root inputs are parameters on root nodes (nodes with no incoming edges) that the user provides at execution time.

1. Click a root node
2. In the Inspector panel, set the parameter as **Root Input**
3. At runtime, the execution dialog will prompt for these values

---

## Step 5 — Execute the workflow

### From the canvas

1. Click **Run** in the toolbar
2. Enter root input values in the dialog
3. Watch node statuses update in real time:
   - ⏳ `pending` — waiting for upstream
   - 🔄 `running` — executing the Lens
   - ✅ `completed` — output available
   - ❌ `failed` — execution error

### From the CLI

```bash
lf run --workflow <workflow-id> \
  --param spec="Build a REST API for todo items"
```

### Dry run (validation only)

```bash
lf run --workflow <workflow-id> --dry-run
```

---

## Step 6 — Inspect results

After execution, each node shows its output in the Inspector panel:

- **Input** — the rendered prompt sent to the model
- **Output** — the model's response
- **Tokens** — prompt + completion token counts
- **Duration** — execution time
- **Cost** — credit cost

### Via CLI

```bash
lf execution inspect <run-id>
```

---

## Runtime debugging

### Execution logs

The canvas provides real-time execution logging:

1. Open the **Run Log** panel (bottom of canvas)
2. Each log entry shows:
   - Timestamp
   - Node name
   - Event type (start, token, complete, error)
   - Payload

### Common execution errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing parameter: [[topic]]` | Root input not provided | Set the parameter value before running |
| `Upstream node failed` | A dependency node errored | Fix the upstream node first |
| `Model timeout` | Provider did not respond in time | Check provider status, increase timeout |
| `Cycle detected` | Graph contains a loop | Remove the edge creating the cycle |

---

## State persistence

Workflows are saved to:

| Mode | Storage |
|------|---------|
| File mode | Browser IndexedDB |
| Supabase mode | `public.workflows` + `public.workflow_nodes` + `public.workflow_edges` tables |

Auto-save triggers on:
- Node creation, deletion, or move
- Edge creation or deletion
- Property changes in the Inspector
- Explicit Save button click

---

## Canvas interaction reference

| Action | Shortcut / Gesture |
|--------|-------------------|
| Pan | Click + drag on background |
| Zoom | Scroll wheel |
| Select node | Click on node |
| Multi-select | Shift + click, or drag selection box |
| Delete selected | `Backspace` or `Delete` |
| Fit to view | `Ctrl/Cmd + Shift + F` |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl/Cmd + Shift + Z` |

---

## Custom node development

To create a new node type:

### 1. Define the node component

```tsx
// libs/features/workflows/src/lib/components/nodes/MyCustomNode.tsx
import { Handle, Position } from '@xyflow/react';

export function MyCustomNode({ data }: { data: MyNodeData }) {
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

### 2. Register the node type

```tsx
const nodeTypes = {
  lens: LensNode,
  custom: MyCustomNode,
};

<ReactFlow nodeTypes={nodeTypes} ... />
```

### 3. Add to the node picker

Update the Lens picker to include your custom node type in the drag palette.

---

## Best practices

1. **Name your nodes clearly** — "Generate Code" is better than "Node 1"
2. **Pin Lens versions** — avoid `latest` in production workflows
3. **Use small Lenses** — each node should do one thing well
4. **Test incrementally** — run partial workflows before the full chain
5. **Save frequently** — use the explicit Save button before closing

---

## Next steps

- [Create a Workflow (walkthrough)](/en/tutorials/walkthroughs/create-a-workflow) — step-by-step guide
- [What Are Workflows?](/en/tutorials/walkthroughs/what-are-workflows) — conceptual overview
- [Local Database](/en/tutorials/local/database) — where workflow data is stored
