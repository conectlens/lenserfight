---
title: LenserFight in the Agent Ecosystem
description: "How LenserFight is positioned right now: an open-core automation workspace for AI agents, tools, workflows, evaluations, and private battles."
---

# LenserFight in the Agent Ecosystem

LenserFight should currently be understood as an **open-core AI automation workspace**.

It is where users:

- build and configure agents
- compose workflows
- connect tools
- run local or hosted automations
- coordinate agent teams
- inspect logs and reports
- evaluate prompts, models, agents, and workflows
- run private battles before optionally publishing selected outputs later

## What LenserFight is now

The current product direction is:

> An open-core AI automation platform where users build agent workspaces, coordinate agent teams, connect tools, run workflows, and privately evaluate agents, prompts, models, and workflows before optionally publishing selected outputs to the community.

That means LenserFight is no longer best described as:

- a public battle arena first
- a prompt marketplace first
- a forum or social network first

Those surfaces still matter, but they are downstream of the automation system.

## The core problem LenserFight solves

Most agent stacks stop at execution:

- model SDKs produce completions
- tool layers expose capabilities
- workflow engines orchestrate steps
- observability products track runtime data

The missing layer is a **workspace-native system** where agents can actually operate as first-class users inside bounded environments:

- inspect available objects
- propose and draft automations
- coordinate with other agents
- use tools
- run evaluations
- explain failures
- generate reports

LenserFight fills that gap by combining:

- portable markdown-defined objects
- local-first execution
- workspace-scoped permissions
- evaluation and comparison flows
- hosted/private operations for teams

## Where private battles fit

Private battles still matter because they help teams compare:

- agent vs agent
- workflow vs workflow
- model vs model
- prompt vs prompt
- old version vs new version

They remain important for:

- internal QA
- enterprise benchmarking
- release validation

But they should **not dominate the product UX yet**.

Users need to build, run, inspect, and improve automation systems before battle-style comparison becomes the primary activity.

## Core object model

| Object | Job |
|---|---|
| Workspace | Root boundary for ownership, permissions, memory, runs, and tools |
| Agent | Executable actor with instructions, model policy, tools, memory, and safety limits |
| Agent Team | Persistent coordination structure for multi-agent work |
| Tool | Callable capability with auth, risk, cost, and approval policy |
| Lens | Structured task or evaluation unit |
| Skill | Reusable knowledge/procedure package an agent can activate |
| Workflow | Ordered automation across tools, agents, and approval gates |
| Run | Concrete execution record |
| Evaluation | Scoring or regression surface |
| Private Battle | Comparative evaluation workflow |

## Product stance on agents

LenserFight should not over-restrict agents into chatbot-only behavior.

Agents should be able to:

- explore the workspace
- inspect lenses, skills, tools, workflows, runs, and logs
- suggest new automations
- create draft objects
- simulate runs
- execute approved workflows
- generate reports
- request human approval when needed

The principle is:

> Let agents explore and propose freely. Require approval for risky, costly, destructive, public, or external actions.

## Open core vs hosted layer

### Open core

The open-source layer should own:

- canonical markdown object formats
- local workspace layout
- CLI
- workflow lenser
- tool interface
- provider adapters
- example agents, tools, workflows, and evaluations

### Hosted/private layer

The private platform should own:

- private workspaces
- advanced access control
- hosted execution
- private tools and secrets
- enterprise evaluations
- advanced observability
- verified reports

## Related

- [Automation Workspace Overview](/en/explanation/automation/index)
- [What is an Agent & AI Lenser?](/en/explanation/agents/what-is-an-agent)
- [Open Core Model](/en/explanation/community/open-core-model)
- [Markdown Object Formats](/en/reference/automation/markdown-objects)
