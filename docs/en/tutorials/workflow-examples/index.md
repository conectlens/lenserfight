---
title: Workflow Examples
description: Realistic, domain-specific examples showing how to build LenserFight Workflows for coding, content creation, finance, research, and startups.
---

# Workflow Examples

A Workflow chains multiple Lenses together so that the output of one step becomes the input of the next. Each example in this section shows a complete, real-world Workflow: the individual Lens definitions, the exact prompt text to write, how the edges connect, and what the final output looks like.

These examples are designed to be copy-pasted and adapted. Treat them as starting points, not finished products.

## Before you start

You should be familiar with:
- [What is a Lens?](/en/explanation/lenses/what-is-a-lens) — a single, reusable task specification with optional parameters
- [What are Workflows?](/en/tutorials/walkthroughs/what-are-workflows) — a DAG of connected Lenses where outputs flow between steps
- [Create a Workflow](/en/tutorials/walkthroughs/create-a-workflow) — how to use the visual Workflow builder

## Core concepts in 60 seconds

**Lens** — one focused task. You write a template body that can reference typed `[[parameters]]`. The model executes it and returns one output.

**Parameter** — a named, typed input slot. In the template body you write `[[param_name]]`. In the Parameters panel you define its label, type (`text`, `textarea`, `select`, `number`, etc.), and whether it is required.

**Workflow node** — a Lens placed on the canvas. It runs the Lens and passes its output forward.

**Edge** — a connection from one node's output to a parameter slot on a downstream node. This is what makes the chain work.

**Root input** — a parameter on a node with no incoming edges. The user fills this in when they run the Workflow.

**Leaf output** — the output of a node with no outgoing edges. This is the final result of the Workflow.

## What these examples cover

| Example | Who it is for | Lenses |
|---------|--------------|--------|
| [Coding Workflows](./coding-workflow) | Developers, engineering teams | 3 pipelines: feature delivery, bug investigation, code documentation |
| [Content Creation Workflows](./content-creation-workflow) | YouTubers, bloggers, podcasters | 3 pipelines: YouTube, blog + social, podcast |
| [Finance Workflows](./finance-workflow) | Founders, operators, analysts | 3 pipelines: KPI review, investor update, budget review ⚠️ Informational only |
| [Research Workflows](./research-workflow) | Researchers, students, analysts | 3 pipelines: literature review, competitive analysis, interview analysis |
| [Startup Workflows](./startup-workflow) | Founders, early-stage teams | 3 pipelines: weekly review, launch prep, hiring pipeline |

## How to read these examples

Each example follows the same structure:

1. **Goal** — what problem it solves and who it is for
2. **Pipeline overview** — an ASCII diagram showing node order
3. **Lens definitions** — the actual template body you should write, with parameters shown inline
4. **Edge wiring** — which output connects to which parameter
5. **Run it** — what root inputs to provide when you press Run
6. **Sample output** — what a typical result looks like
7. **Variations** — common ways to extend or adapt the Workflow

## Reading the flow diagrams

```
[Node name]  →  [Next node]  →  [Final node]
    ↓                ↓               ↓
 (output)      (takes output    (produces final
               as input)         result)
```

Arrows show data flow direction. Each box is one Lens.

## Quick terminology note

| Term | Meaning in this doc |
|------|---------------------|
| `[[param]]` | A parameter slot in a Lens template body |
| **root input** | A parameter the user fills when running the Workflow |
| **pass-through** | An edge that feeds one node's output into the next node's `[[param]]` |
| **leaf output** | The last node's output — the Workflow result |

---

Ready? Pick a domain:

- [Coding Workflows →](./coding-workflow)
- [Content Creation Workflows →](./content-creation-workflow)
- [Finance Workflows →](./finance-workflow) *(informational only — not financial advice)*
- [Research Workflows →](./research-workflow)
- [Startup Workflows →](./startup-workflow)
