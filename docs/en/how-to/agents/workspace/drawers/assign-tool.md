---
title: Assign Tool drawer
description: Allow or deny a registered tool for this agent.
---

# Assign Tool drawer

Opened from the [Tools Section](../tools).

## What it does

Adds or updates the agent's **tool assignment row** for one registered tool. Assignment is the gate that lets the agent call a tool at runtime. Without an allowed assignment, the gateway short-circuits invocations with `tool_not_assigned`.

The drawer writes the assignment for the current `ai_lenser_id`, so it changes only the agent whose workspace you are viewing.

## Fields

| Field | Required | Notes |
|---|---|---|
| **Tool** | yes | Picker from the `tool_registry` rows you own. The UI label combines the tool name and registry key. |
| **Allowed** | yes (default on) | When off, the tool is on the **deny list** even if assigned. |

## Step-by-step

1. Open [Tools](../tools) and confirm the tool is already registered.
2. Select **Assign tool**. If you opened the drawer from a specific tool row, that tool is preselected while it still exists in the registry.
3. Choose the **Tool** to assign.
4. Keep **Allowed** on to permit runtime calls, or turn it off to record an explicit deny.
5. Save. The drawer sends `ai_lenser_id`, `tool_id`, and `allowed` to the workspace assignment service.
6. Return to the Tools section and confirm the assignment row shows the expected allow state.

## Idempotency

Re-assigning the same tool overwrites the `allowed` flag. There is no duplicate row.

## Validation

| State | What happens |
|---|---|
| No registered tools | The drawer shows an empty state and asks you to register a tool first. |
| No tool selected | The submit button stays disabled. |
| Tool deleted while open | Close and reopen the drawer so the picker reloads from the latest registry. |
| Assignment service fails | The drawer keeps the form open and shows the service error. |

## Side effects

- Upserts an `agents.tool_assignments` row.
- Invalidates `toolAssignments(activeAiLenserId)`.
- Emits `tool.assigned` into the [Logs section](../logs).

## Operational checks

- Assignment is not invocation. After assigning a tool, verify real execution in [Tool Invocation](./tool-invocation) or the related [Run Detail](./run-detail).
- Use an explicit deny when a tool belongs in the workspace registry but this agent must never call it.
- Review [Approvals](../approvals) when the tool can mutate external systems, spend money, publish content, or access sensitive data.

## Related

- [Tools Section](../tools)
- [Register Tool drawer](./register-tool)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
