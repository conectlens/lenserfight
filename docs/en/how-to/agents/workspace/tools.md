---
title: Tools Section
description: Register, assign, and audit tools the agent may call. Tools are sandboxed per egress class; elevated classes require approval.
---

# Tools Section

**Route:** `/lenser/<handle>/ag/tools`

The Tools section is the **registry + assignment + audit** surface for any callable capability outside the model itself: HTTP fetches, file IO, vector lookups, third-party APIs, internal RPCs.

## Egress classes

| Class | Network access | Requires approval |
|---|---|---|
| `none` | no network, pure CPU | no |
| `read` | network read-only (GET) | no |
| `network` | full HTTP (POST/PUT/PATCH) | **yes** |
| `mutation` | writes to platform data | **yes** |

Higher classes force an approval gate before the call is dispatched. See [Approvals Section](./approvals).

## Tabs

- **Registry** — every tool you've registered. Open the [Register Tool drawer](./drawers/register-tool) to add one.
- **Assignments** — allow/deny matrix for this agent. Open the [Assign Tool drawer](./drawers/assign-tool).
- **Approval queue** — tool calls waiting on a human gate.
- **Invocation log** — historical calls with args, result, latency. Click a row to open the [Tool Invocation drawer](./drawers/tool-invocation).


## Code-backed workflow

Source of truth: ToolsSection.tsx plus Register, Assign, Profile, and Invocation drawers. The implementation separates registry, assignment, policy profiles, approvals, and invocation history.

1. Register a tool in the workspace registry.
2. Assign the tool to the agent and decide whether it is allowed.
3. Add a tool profile when the tool needs policy, auth, sandbox, or approval metadata.
4. Review approval queue and invocation history after live runs.

Verification: a real tool call should appear in [Tool Invocation](./drawers/tool-invocation) and related [Run Detail](./drawers/run-detail).

## Related

- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
- [Tools Reference](/en/reference/internals/tools)
- [Register Tool drawer](./drawers/register-tool)
- [Assign Tool drawer](./drawers/assign-tool)
