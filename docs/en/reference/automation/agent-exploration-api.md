---
title: Agent Exploration API
description: Internal workspace functions that let agents inspect, draft, simulate, evaluate, and escalate safely.
---

# Agent Exploration API

<ExperimentalBadge title="Automation" description="This area is under active construction. File formats, APIs and runtime behaviour may shift without notice — try it, but treat it as pre-stable." />


The exploration API is the internal capability surface that lets agents behave like first-class workspace operators without unrestricted write access.

## Rule

Agents should have:

- broad read/explore permissions
- constrained draft and execution permissions
- explicit human approval for risky actions

## Core functions

| Function | Purpose | Permission | Approval | Logging |
|---|---|---|---|---|
| `list_workspace_objects` | Enumerate objects by type and scope | Read | No | summary |
| `read_object` | Read one object in full | Read | No | summary |
| `search_objects` | Search workspace objects | Read | No | summary |
| `suggest_workflow` | Propose a workflow design | Suggest | No | full |
| `create_draft_lens` | Create a draft lens | Draft | No | full |
| `create_draft_agent` | Create a draft agent | Draft | No | full |
| `create_draft_tool` | Create a draft tool | Draft | No | full |
| `create_draft_workflow` | Create a draft workflow | Draft | No | full |
| `simulate_run` | Dry-run an object locally | Simulate | No | full |
| `run_evaluation` | Execute an evaluation suite | Execute | Maybe | full |
| `prepare_private_battle` | Draft a private battle spec | Draft | No | full |
| `generate_report` | Produce a report artifact | Execute | No | full |
| `request_human_approval` | Escalate a risky action | Suggest | No | full |

## Safety stance

Agents should be able to:

- inspect objects freely
- draft new objects
- propose changes
- simulate work

Agents should not silently:

- publish publicly
- destroy data
- send external messages
- rotate provider credentials
- exceed workspace cost rules

## Audit requirements

Every non-read action should log:

- actor type and actor id
- workspace id
- action verb
- target object
- approval ticket id if present
- cost and latency if applicable
- result status
- version references

## Related

- [Markdown Object Formats](/en/reference/automation/markdown-objects)
- [Automation Workspace Overview](/en/explanation/automation/index)
