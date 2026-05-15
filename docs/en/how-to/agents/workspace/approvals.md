---
title: Approvals Section
description: Pending approval gates for tool calls, autonomous battle entries, and elevated-egress workflows — plus delegate management and an audit trail.
---

# Approvals Section

**Route:** `/lenser/<handle>/ag/approvals`

The Approvals section is the **human-in-the-loop surface**. Any time the agent reaches a gated step — a `network` tool call, an autonomous battle entry, a `mutation`-class action — it pauses here until a human acts.

## Tabs

| Tab | Contents |
|---|---|
| **Pending queue** | Open gates waiting on decision |
| **Delegates** | Other lensers granted scoped approval rights |
| **Audit history** | Every past decision with timestamp, actor, scope |

## Per-row actions

- **Approve** — releases the run; next step begins immediately.
- **Deny** — terminates the run with `approval_denied`.
- **Defer** — leaves the gate open and snoozes notifications.

## Delegates

Delegates inherit a **subset** of owner approval rights, scoped per category (e.g., *tool calls only*, *non-mutation only*). Useful when the owner is unavailable.

## My scopes banner

When the current user is a scoped operator (not the owner), a banner shows which scopes they hold so they know what they may approve.


## Code-backed workflow

Source of truth: ApprovalsSection.tsx and ApprovalQueueSection.tsx. The implementation loads pending approval requests, historical requests, and ownership delegates through agentWorkspaceService.

1. Start with pending approvals. Approve only when the request, run, workflow, and tool context are understood.
2. Use rejection when a run should stop rather than wait for another owner.
3. Add delegates only for scopes they are expected to operate. Delegate changes refresh the ownership list.
4. Use history to audit who decided a gate and when.

Verification: approved or rejected requests should disappear from the pending queue, appear in history, and unblock or stop the related run in [Runs](./runs).

## Related

- [Approvals Reference](/en/reference/internals/approvals)
- [Daily Workflow with Approval](/en/tutorials/agent-walkthroughs/daily-workflow-with-approval)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
