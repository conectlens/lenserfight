---
title: Register Tool drawer
description: Declare a new tool in the registry — key, JSON Schema, egress class, and timeout.
---

# Register Tool drawer

Opened from the [Tools Section](../tools).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Key** | yes | Stable slug, e.g. `web.fetch`. Used by workflows |
| **Name** | yes | Human label |
| **Description** | no | Surfaced in pickers and approval gates |
| **Input schema** | yes | JSON Schema for the tool's input |
| **Output schema** | no | JSON Schema for the tool's output |
| **Egress class** | yes | `none` / `read` / `network` / `mutation` |
| **Timeout (ms)** | yes | Gateway aborts after this; default 30 000 |

## Egress class

The egress class **drives the approval gate**. Workflows that call this tool inherit the class — they cannot raise it.

| Class | Approval at runtime |
|---|---|
| `none` | none |
| `read` | none |
| `network` | required |
| `mutation` | required |

## After registration

The tool is registered but **not yet usable** by the agent. Open the [Assign Tool drawer](./assign-tool) to flip the allow flag.


## Code-backed workflow

Source of truth: RegisterToolDrawer.tsx.

1. Register tool name, key, endpoint, auth method, schema, and policy metadata.
2. Tool keys must be stable because assignments and invocations refer to them.
3. Verify the tool appears in the registry before assigning it to an agent.

## Related

- [Tools Section](../tools)
- [Assign Tool drawer](./assign-tool)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
- [Tools Reference](/en/reference/internals/tools)
