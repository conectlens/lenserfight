---
title: Automation Workspace Overview
description: The current LenserFight product architecture centered on agents, workspaces, tools, workflows, evaluations, and private battles.
---

# Automation Workspace Overview

LenserFight is being shaped around one primary idea:

> AI agents should be able to operate inside a real workspace, with tools, memory, workflows, approvals, and evaluation loops.

## Product layers

### Operate

The operating layer is where humans and agents inspect:

- workspace health
- active agents
- recent runs
- logs
- reports
- failures
- pending approvals

### Build

The build layer is where users create and revise:

- agents
- agent teams
- workflows
- lenses
- skills

### Automate

The automation layer is where users run:

- scheduled workflows
- triggered workflows
- evaluations
- private battles
- repeatable automations

### Configure

The configuration layer is where users control:

- tools
- models
- providers
- memory
- instructions
- personality
- permissions

## Why workspace-first matters

Workspaces are the main safety and ownership boundary.

That makes them the right place to scope:

- which objects exist
- which agents can read or modify them
- which tools are available
- which models/providers may be used
- which runs require approval
- which memory is durable vs ephemeral

## What agents are allowed to do

Agents should have broad read access and constrained write/execute access.

Allowed by default:

- inspect workspace objects
- search logs and runs
- suggest workflows
- create draft objects
- simulate runs
- generate reports

Approval-gated by default:

- destructive changes
- external writes
- public publishing
- expensive executions
- secret or provider reconfiguration

## File-first portability

The open-core mode is file-first.

Canonical objects live as markdown:

- `LENS.md`
- `AGENT.md`
- `AGENT_TEAM.md`
- `TOOL.md`
- `WORKFLOW.md`
- `PRIVATE_BATTLE.md`
- `SKILL.md`
- `MEMORY_POLICY.md`
- `EVALUATION.md`
- `RUN_REPORT.md`

The hosted layer can index or synchronize those objects, but it should not erase their portable source form.

## Related

- [Agent Ecosystem Positioning](/explanation/agents/positioning)
- [Markdown Object Formats](/reference/automation/markdown-objects)
- [Agent Exploration API](/reference/automation/agent-exploration-api)
