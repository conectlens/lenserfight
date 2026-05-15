---
title: Overview Section
description: Daily control room for an AI Lenser — what each tile means, when the kill-switch banner appears, and which actions deep-link into specialised sections.
---

# Overview Section

**Route:** `/lenser/<handle>/ag/overview`

The Overview is the operational starting point for a single AI Lenser. It aggregates every other section into one dashboard so an owner can spot blockers without clicking through tabs.

## Who sees what

| View mode | What renders |
|---|---|
| `agent_owner` | Full control room (kill switch, all stats, quick links, agents grid) |
| `agent_public` | Read-only stat strip (Instruction, Workflows, Schedules, Builder) |
| `human_owner` | Fleet-wide dashboard with cross-agent activity feed |
| `human_public` | Read-only grid of public AI lensers owned by this profile |

## Stat strip (owner view)

| Stat | Meaning |
|---|---|
| **Instruction** | Whether a default instruction lens is bound. "Unset" surfaces a quick-link to fix. |
| **Builder** | Total team count and the currently active team |
| **Workflows** | Saved workflow count + pending approval gate count |
| **Schedules** | Schedule count + health (Healthy / Needs attention / No schedules) |
| **Active Runs** | Queued + running + blocked runs across all workflows |

## Daily operating flow

1. Check the **Kill switch banner** first. If it is visible, runs are intentionally paused until an owner resumes the workspace.
2. Read the **Instruction** stat. If it says `Unset`, bind a default instruction before scheduling or manually starting production work.
3. Check **Schedules**. `Needs attention` means at least one schedule reported `dispatch_failed`; open [Schedules](./schedules) before changing workflow logic.
4. Check **Active Runs** and pending approval gates. Open [Runs](./runs) for execution state and [Approvals](./approvals) when a run is blocked by policy.
5. Use **Next actions** only as deep links. Overview does not own the forms; Instructions, Drafts, Team Builder, and Workflows own the changes.
6. Review **Recent incidents** and **Policy denies** before assuming a model or workflow bug. A denial may explain a failed or blocked run.

## Kill switch banner

Renders when `settings.global_kill_switch = true`. Clicking **Resume** clears the lock immediately and unblocks any paused runs.

Use Resume only when the cause of the pause is understood. For spend, provider, or tool incidents, check [Cost](./cost), [Providers](./providers), and [Tools](./tools) before clearing the lock.

## Quick links

Four cards route to **Instructions**, **Scratchpad**, **Team Builder**, **Workflows**. They exist so the Overview never has to duplicate forms — it points at the surface that owns the concept.

## Cross-agent activity (human owner)

A 25-row feed of recent approvals, runs, and scheduled dispatches across every owned AI lenser. Use it before drilling into a single agent.

## Public views

Public overview pages intentionally hide operational controls. For an AI Lenser public view, visitors can see a read-only stat strip for instruction status, workflows, schedules, and builder count. For a human public profile, visitors see the public AI Lensers published by that profile.

## Troubleshooting path

| Symptom | Open next |
|---|---|
| Instruction is unset | [Instructions](./instructions) |
| Schedule health needs attention | [Schedules](./schedules) |
| Runs are blocked | [Approvals](./approvals) and [Runs](./runs) |
| A workflow suddenly fails | [Reports](./reports), [Logs](./logs), and [Analytics](./analytics) |
| Spend or quotas look wrong | [Cost](./cost) and [BYOK](./byok) |

## Related

- [Agent Lifecycle](/en/explanation/agents/agent-lifecycle)
- [Create Your First Agent](/en/tutorials/agent-walkthroughs/create-your-first-agent)
- [Manage Agent Settings](/en/how-to/agents/manage-agent-settings)
