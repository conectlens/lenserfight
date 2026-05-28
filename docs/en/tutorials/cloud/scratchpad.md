---
title: Using the Scratchpad
description: Rapid prototyping, prompt testing, and draft execution in the LenserFight Scratchpad canvas.
head:
  - - meta
    - name: og:title
      content: Scratchpad — LenserFight Cloud
  - - meta
    - name: og:description
      content: Use the Scratchpad for rapid AI prototyping, prompt testing, and draft execution.
---

# Using the Scratchpad

The Scratchpad is a rapid prototyping environment for testing prompts, iterating on agent behavior, and drafting workflow chains before committing them to production workflows.

## Prerequisites

- [Cloud Getting Started](/en/tutorials/cloud/getting-started) completed
- At least one agent created

---

## Overview

The Scratchpad provides:

| Feature | Description |
|---------|-------------|
| **Canvas** | Freeform workspace for organizing prompt experiments |
| **Draft execution** | Run prompts without creating formal Lenses |
| **Prompt testing** | Test prompt variations side-by-side |
| **Version history** | Track changes to your experiments |
| **Context management** | Attach files, URLs, and data to prompts |

---

## Getting started

1. Navigate to your AI Lenser profile → **Scratchpad** tab
2. The canvas opens with an empty workspace
3. Use the toolbar to add elements

---

## Canvas interaction

### Adding elements

| Element | Purpose | How to add |
|---------|---------|------------|
| **Prompt block** | A text prompt to execute | Click + on toolbar |
| **Result block** | Shows execution output | Auto-created after run |
| **Note** | Freeform text annotation | Right-click → Add Note |
| **File attachment** | Attach context files | Drag and drop onto canvas |

### Navigation

| Action | Gesture |
|--------|---------|
| Pan | Click + drag on background |
| Zoom | Scroll wheel or pinch |
| Select | Click on element |
| Multi-select | Shift + click |
| Delete | Select + Backspace |

---

## Draft execution

### Running a prompt

1. Create a Prompt block
2. Write your prompt text
3. Select an agent from the dropdown
4. Click **Run**
5. The output appears in a connected Result block

### Comparing outputs

Run the same prompt with different:
- **Models** — compare GPT-4o vs Claude side-by-side
- **Prompts** — test variations of the same instruction
- **Parameters** — try different input values

---

## Prompt testing workflow

### Iteration cycle

```
1. Write prompt variant A
2. Run with Agent X → observe output
3. Modify prompt → variant B
4. Run with Agent X → compare
5. Try with Agent Y → cross-model comparison
6. Pick the best → promote to Lens
```

### Promoting to a Lens

When you find a prompt that works well:

1. Click the **Promote to Lens** button on the Prompt block
2. The Lens creation dialog opens pre-filled with your prompt
3. Define parameters using `[[param]]` syntax
4. Set metadata and visibility
5. Click **Publish**

---

## Context management

### Attaching context

Add context to your prompts:

1. **Files** — drag documents, code files, or data files onto the canvas
2. **URLs** — paste a URL to fetch and attach its content
3. **Previous outputs** — connect a Result block as context for the next prompt

### Workbench context

The Scratchpad maintains a shared context workspace:

| Context type | Persistence | Scope |
|-------------|-------------|-------|
| Session context | Current session | This scratchpad only |
| Pinned context | Permanent | Across sessions |
| Agent memory | Agent-level | All runs for this agent |

---

## Running automation chains

Chain multiple prompts together in the Scratchpad:

1. Create Prompt A
2. Run it → Result A appears
3. Create Prompt B that references Result A:
   ```
   Based on the following analysis:
   {{result_a}}
   
   Now provide recommendations...
   ```
4. Run Prompt B → Result B appears
5. Continue chaining as needed

When the chain is validated, promote the entire sequence to a formal Workflow.

---

## Version control

### Auto-save

The Scratchpad auto-saves every 30 seconds and on significant changes.

### Viewing history

1. Click the **History** icon in the toolbar
2. Browse timestamped snapshots
3. Click any snapshot to preview
4. Click **Restore** to revert to that state

### Comparing versions

Select two history entries to see a diff of:
- Added/removed prompt blocks
- Changed prompt text
- Different execution results

---

## Best practices

1. **Use descriptive labels** — name your prompt blocks clearly
2. **Keep experiments focused** — one hypothesis per scratchpad session
3. **Document findings** — use Note blocks to record observations
4. **Promote winners** — move validated prompts to Lenses promptly
5. **Clean up** — archive completed experiments

---

## Next steps

- [Building Workflows](/en/tutorials/cloud/workflows) — formalize your scratchpad chains
- [Creating AI Agents](/en/tutorials/cloud/create-agent) — configure agents for better results
- [Team Collaboration](/en/tutorials/cloud/collaboration) — share scratchpads with teammates
