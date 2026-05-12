---
title: Tool Sandboxing
description: How egress classes, approval gates, and future network/container sandboxes work together to keep tool calls safe.
---

# Tool Sandboxing

## Why sandboxing?

Agents are stateful, autonomous, and fast. Without boundaries, a misbehaving agent or a compromised prompt could exfiltrate data, spam external APIs, or mutate critical systems before a human notices. Sandboxing means the platform enforces limits — not just the agent author, and not just the operator.

## Egress classes

Every tool in the registry has an `egress_class`:

| Class | What it means |
|-------|--------------|
| `none` | The tool has no network contact outside the platform. Pure computation or in-platform reads. |
| `read_only` | The tool calls external systems but only reads data (HTTP GET, SELECT-equivalent). Idempotent. |
| `write` | The tool mutates external state — POST, PUT, DELETE, webhook, email send, file write. **Non-idempotent.** |

This classification is declared by the tool author in `TOOL.md` (as `permission_level`) and stored in `agents.tools_registry.egress_class` when registered.

## The write-class enforcement trigger

When a tool is inserted or updated with `egress_class='write'`, the database trigger `trg_tools_registry_egress_guard` automatically sets `requires_approval=true`:

```sql
IF NEW.egress_class = 'write' AND NEW.requires_approval = false THEN
  NEW.requires_approval := true;
END IF;
```

This is enforced at the database level — no application code can bypass it by passing `requires_approval=false` for a write-class tool. The operator can verify this by checking the registry row after registration.

## Approval gates

`fn_invoke_tool` computes `approval_required` from three sources, in order:

1. `tools_registry.requires_approval` (possibly auto-set by the trigger above).
2. The agent's tool profile policy overrides (if one is assigned).
3. A future `p_bypass_approval` flag gated on `service_role` only.

If `approval_required=true`, the invocation row enters `status='pending'`, `approval_status='pending'`. The workflow runtime halts that branch and emits a `tool_invocation_approval_required` event. The operator sees the row in the **Approvals** tab of the agent workspace.

When the operator approves, `fn_approve_tool_invocation` flips the row to `status='running'`, `started_at=now()`. The runtime resumes.

When the operator rejects, the row becomes `status='rejected'`. The reason is stored in `approval_reason`. The runtime receives a rejection event and can fail gracefully.

## Future: network sandboxing

Today, the egress class is a **soft** control — it restricts when the agent *asks* to call a tool, but it does not prevent the tool runtime itself from making arbitrary network calls once approved.

The intended future state is a hard network sandbox:

- `none` tools run in a network-isolated container with no outbound routes.
- `read_only` tools run with an allow-list of egress CIDRs (the target service's IP range).
- `write` tools run in a dedicated container with a full egress allow-list, but only after the approval is recorded.

This requires infrastructure work outside the Postgres layer and is tracked as a follow-up.

## Future: container isolation

Similarly, tool execution today is handled by the agent runtime process. A future enhancement would run each tool invocation in an ephemeral container with:

- Read-only filesystem (no implicit writes to shared state).
- Resource limits (CPU, memory, wall-clock timeout).
- Credential injection via a secrets manager, not env vars.

The `tool_invocations` table already has `started_at`, `completed_at`, and `cost_estimate` columns to support resource accounting once container orchestration is added.

## Risks and non-goals

- **Cost reporting is self-reported.** The agent runtime writes `cost_estimate` via `fn_complete_tool_invocation`. No server-side validation today.
- **Prompt injection through tool output** is a separate concern. Tool outputs that feed back into the next prompt step must be sanitized by the node author. The sandboxing layer does not parse tool output.
- **Approval unification** with Phase 4 (`agents.team_runs.approval_status`) is deferred. The two flows coexist until a unified approval table is justified by operational complexity.
