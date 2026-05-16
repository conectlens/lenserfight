---
title: Tool Profile drawer
description: Create a named access-policy preset — allow list, deny list, tool groups, and approval requirement — that governs which registered tools this agent may invoke.
---

# Tool Profile drawer

Opened from the [Tools Section](../tools) (Policies tab).

## What's a tool profile?

A **tool profile** is an agent-scoped access policy that controls which registered tools the agent may call. It works as a named allow/deny preset — you can swap profiles to change the agent's access without editing individual assignments.

## Fields

| Field | Notes |
|---|---|
| **Name** | Identifies the preset — e.g. *Strict read-only*, *Full ops access*, *Sandboxed* |
| **Allow tools** | Comma-separated tool keys explicitly permitted. Empty = all non-denied tools allowed |
| **Deny tools** | Comma-separated tool keys explicitly blocked. **Takes precedence over the allow list** |
| **Tool groups** | Comma-separated group names. Groups expand into all tools within the bundle (e.g. `workflow`, `catalog`, `logging`) |
| **Requires approval** | When checked, dangerous tool calls always require human sign-off regardless of individual tool flags |

## Precedence rules

```
final_access = allow_tools ∩ tool_groups − deny_tools
```

If deny_tools is empty and allow_tools is empty: all tools in the active groups are reachable.

## Typical presets

| Profile name | Allow | Deny | Groups | Approval |
|---|---|---|---|---|
| Read-only analyst | *(empty)* | `email.send, payments.*` | `catalog, logging` | off |
| Ops engineer | *(empty)* | *(empty)* | `workflow, catalog, logging, ops` | on |
| Sandboxed eval | `eval.score, memory.read` | *(empty)* | *(empty)* | off |

## Side effects

- Inserts or updates an `agent_tool_profiles` row.
- The next dispatch picks up the new profile; in-flight runs are unaffected.

## Related

- [Tools Section](../tools)
- [Register Tool drawer](./register-tool)
- [Assign Tool drawer](./assign-tool)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
