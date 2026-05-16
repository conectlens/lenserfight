---
title: Register Tool drawer
description: Declare a new tool in the registry — key, name, description, category, auth method, input/output JSON schemas, and safety flags.
---

# Register Tool drawer

Opened from the [Tools Section](../tools).

## Fields

| Field | Required | Notes |
|---|---|---|
| **Key** | yes | Stable, lowercase slug. **Cannot be changed after creation.** Example: `web.search`, `github.pr.create` |
| **Name** | yes | Human-readable label shown in pickers and approval gates |
| **Description** | no | Surfaces in the tool picker tooltip and the approval review screen |
| **Category** | yes | Groups tools in the picker. Reuse existing slugs: `search`, `code`, `communication` |
| **Auth method** | yes | `none` · `api_key` · `oauth` · `service_account` |
| **Input schema** | no | JSON Schema for the tool's input — used for validation and workflow editor hints |
| **Output schema** | no | JSON Schema for the tool's output — improves downstream type safety |
| **Requires approval** | toggle | Forces a human approval gate before every invocation |
| **Dangerous tool** | toggle | Tags the tool as high-risk; always queued for approval regardless of the toggle above |

## Auth methods

| Method | Where credential lives |
|---|---|
| `none` | No credentials needed |
| `api_key` | Secret stored in Supabase Vault — encrypted at rest |
| `oauth` | User-delegated token via OAuth flow |
| `service_account` | Workspace-level credentials shared across agents |

## After registration

The tool appears in the registry but **is not yet usable** by the agent. Open the [Assign Tool drawer](./assign-tool) to flip the allow flag for a specific agent.

## Key naming conventions

Keys are the stable reference used in workflows and assignments. Choose a namespace:

```
{domain}.{action}          → web.search, web.fetch
{service}.{resource}.{op}  → github.pr.create, slack.message.send
{internal}.{function}      → memory.write, eval.score
```

## Related

- [Tools Section](../tools)
- [Assign Tool drawer](./assign-tool)
- [Tool Profile drawer](./tool-profile)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
