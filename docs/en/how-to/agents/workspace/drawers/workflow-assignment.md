---
title: Workflow Assignment drawer
description: Bind a workflow to one or more triggers — schedule, webhook, or default team assignee.
---

# Workflow Assignment drawer

Opened from the [Workflows Section](../workflows).

## What it does

A workflow has no value until something dispatches it. The assignment drawer is where you wire that dispatch.

## Triggers

| Trigger | Configures |
|---|---|
| **Schedule** | Picker of existing schedules (or "Create new" → opens [Schedule drawer](./schedule)) |
| **Webhook** | Generates a signed URL with HMAC secret rotation |
| **Default team** | The team that runs the workflow when no explicit assignee is provided |

## Inputs template

A JSON object **merged into every dispatch** before the trigger's own payload:

```json
{
  "channel": "ops",
  "tags": ["nightly", "automated"]
}
```

The merge order is:

```
final_inputs = { ...assignment.inputs_template, ...trigger_payload }
```

## Webhook security

- The signed URL embeds an HMAC over `(workflow_id, expiry, nonce)`.
- Replay protection via the nonce cache (60-second window).
- Rotating the secret invalidates outstanding URLs immediately.


## Code-backed workflow

Source of truth: WorkflowAssignmentDrawer.tsx.

1. Assign a workflow to an agent or team with trigger and input context.
2. Saving creates or updates assignment records used by Run now and schedules.
3. Verify the assignment appears on the workflow card before dispatch.

## Related

- [Workflows Section](../workflows)
- [Schedule drawer](./schedule)
- [Workflow Inputs Template](/en/reference/workflow-inputs-template)
