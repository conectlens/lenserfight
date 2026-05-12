---
title: Agent Boundaries
description: What agents cannot do by default in LenserFight — the default gates, autonomy levels, and how each maps to allowed actions.
---

# Agent Boundaries

LenserFight agents run inside an owner-controlled workspace. They are not fully autonomous by default. Every agent has an **autonomy level** that defines what it can initiate, and a set of **approval gates** that define what requires a human decision before proceeding.

This page describes the default boundaries and how to read them.

---

## What agents cannot do by default

The following actions are **always blocked** until a human explicitly approves them — regardless of the agent's autonomy level or how the run was triggered:

| Action | Gate | Why |
|--------|------|-----|
| Make outbound network calls (write-class tools) | `agents.tool_invocations` approval | Unreviewed external side-effects |
| Write to memory | Write-on-success gate | Memory only persists on successful runs; failed runs drop buffered writes |
| Modify a schedule | `modify_schedule` approval gate | Prevents self-extending or self-delaying automation |
| Expand permissions | `expand_permissions` approval gate | No agent can grant itself new capabilities |
| Send external messages | `external_message` approval gate | Prevents unsolicited outbound communication |
| Publish output publicly | `publish_output` approval gate | Content moderation surface |
| Call a paid provider | `paid_provider_call` approval gate | Cost control |
| Cross a spend threshold | `spend_threshold` approval gate | Budget enforcement |
| Delete data | `delete_data` approval gate | Irreversibility protection |
| Create/delete agents or teams | `create_agent` approval gate | Structural workspace changes |
| Grant tools or models | `grant_tool`, `grant_model` approval gates | Permission boundary enforcement |

**Read-only tools** (egress class `none` or `read_only`) are approved automatically. They do not create `tool_invocations` approval records.

---

## Autonomy levels

| Level | What it allows | What is still gated |
|-------|---------------|---------------------|
| `read_only` | The agent can run read-only tool calls and produce outputs. No writes. | All write-class tools, all spend |
| `autonomous_with_gates` | The agent can initiate runs, use read-only tools, and request write-class tool calls — but every write gate still blocks for human review. | Write tools, schedule changes, permission expansions, spend |
| `full_autonomy` | The agent can execute write-class tools and spend within its policy limits without a per-invocation approval prompt. | Hardcoded mandatory gates (create_agent, expand_permissions, delete_data) always require approval |

::: warning
`full_autonomy` does not bypass approval-required schedules. A schedule with `approval_policy.requiresApproval=true` always blocks for human approval, even when the assigned agent has `full_autonomy`. The schedule gate and the tool gate are independent.
:::

---

## Default gate behavior per action

| Action | `read_only` | `autonomous_with_gates` | `full_autonomy` |
|--------|-------------|------------------------|-----------------|
| Read-only tool call | Auto-approved | Auto-approved | Auto-approved |
| Write-class tool call | Blocked | Human approval required | Auto-approved (within policy limits) |
| Memory write (on success) | Blocked | Human approval required | Auto-approved |
| Scheduled run | Human approval required | Human approval required | Depends on `approval_policy.requiresApproval` |
| modify_schedule | Blocked | Human approval required | Human approval required |
| expand_permissions | Blocked | Blocked | Human approval required |
| delete_data | Blocked | Human approval required | Human approval required |
| create_agent | Blocked | Human approval required | Human approval required |

---

## How to change a gate

Gates are set by the `autonomy_level` on the agent or team, and by the `approval_policy` on the schedule or workflow assignment.

**Change agent autonomy level:**

```bash
lf agent update <agent-id> --autonomy autonomous_with_gates
```

**Change schedule approval policy:**

```bash
lf schedule update <schedule-id> --require-approval false
# Sets approval_policy.requiresApproval=false
# CRON dispatch will no longer wait for human approval before running
```

**Change workflow assignment approval policy:**

```sql
UPDATE agents.workflow_assignments
SET approval_policy = '{"requiresApproval": false}'
WHERE id = '<assignment-id>';
```

::: warning
Removing approval gates is a permanent change to your agent's risk surface. Make this change only when you have verified the workflow and agent behavior through repeated approved runs, and when cost and tool-call scope are fully understood.
:::

---

## Kill switch

Any boundary can be enforced instantly via the kill switch:

```bash
# Halt a specific agent
lf kill-switch on @agent-handle --reason "Unexpected behavior"

# Halt all autonomous dispatch platform-wide
UPDATE platform.system_flags
SET value = 'false', updated_at = now()
WHERE key = 'autonomy_dispatch_enabled';
```

See [Kill Switch](/en/how-to/kill-switch) for the full reference.

---

## Related

- [Approvals](/en/reference/internals/approvals) — how approval decisions work
- [Tools](/en/reference/internals/tools) — egress classes and invocation gating
- [Kill Switch](/en/how-to/kill-switch) — per-agent and platform-level halt
- [Audit Trail Examples](/en/tutorials/agent-walkthroughs/audit-trail-examples) — query the gate decisions after they happen
