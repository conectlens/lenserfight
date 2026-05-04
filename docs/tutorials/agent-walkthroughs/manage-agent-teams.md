---
title: Manage Agent Teams
description: Tutorial for creating an agent team, adding specialist members, configuring autonomy levels, assigning a workflow, and handling the approval queue.
---

# Manage Agent Teams

An Agent Team groups multiple AI Lensers so they can collaborate on a Workflow — with specialist roles, controlled autonomy, and a full audit trail. This tutorial walks through creating a team, adding members, assigning a workflow, and handling the approval queue.

**Prerequisites:**
- At least 2 registered runners (see [Create Your First Agent](/tutorials/agent-walkthroughs/create-your-first-agent))
- At least 1 published Workflow with 2+ nodes (see [Create a Workflow](/tutorials/walkthroughs/create-a-workflow))

---

## Step 1 — Understand the team structure

Before creating anything, understand how the pieces fit together:

```
Human Lenser (you, the owner)
  └── AI Lenser A (your first agent)
        └── Agent Team "Research & Write"
              ├── Member: AI Lenser A (Researcher)
              │     └── edge: handoff → Writer
              └── Member: AI Lenser B (Writer)
        └── Workflow Assignment → "daily-digest" workflow
              └── Policy: approval=human_in_loop, retry=3
```

A **Workflow Assignment** is the link between the team and a specific workflow. It carries all four policy bundles: approval, retry, failure, and queue.

---

## Step 2 — Create the team

Teams can be created in the web app (AI Workspace → Teams tab) or the CLI:

```bash
lf team create \
  --name "Research & Write" \
  --owner-runner-id <your-primary-runner-id>
```

The `--owner-runner-id` is the AI Lenser that "owns" the team from the agent side. Typically this is your primary agent. The human owner (you) always has override authority regardless.

```bash
# Confirm the team was created
lf team list
```

---

## Step 3 — Add members

Each team member is a runner (AI Lenser) bound to the team with a role label:

```bash
# Add the first member as researcher
lf team member add \
  --team-id <team-id> \
  --runner-id <runner-id-a> \
  --role researcher

# Add the second member as writer
lf team member add \
  --team-id <team-id> \
  --runner-id <runner-id-b> \
  --role writer

# Confirm members
lf team member list --team-id <team-id>
```

Role labels are free-form strings — they describe the member's specialization to humans and are used by the assignment algorithm to match nodes to members.

---

## Step 4 — Add a team edge

Edges describe how members collaborate. For a research-then-write pipeline, add a `handoff` edge — the researcher's step must complete before the writer starts:

```bash
lf team edge add \
  --team-id <team-id> \
  --from <runner-id-a> \
  --to <runner-id-b> \
  --type handoff
```

Available edge types:

| Type | Blocking | Meaning |
|------|---------|---------|
| `delegates` | No | A asks B to handle a sub-task |
| `reviews` | **Yes** | B must review A's output before A continues |
| `reports_to` | No | A surfaces status to B (informational) |
| `shares_context` | No | B can read A's scratchpad |
| `handoff` | **Yes** | A finishes; B picks up the next phase |

---

## Step 5 — Assign a workflow with a policy bundle

A Workflow Assignment binds your workflow to the team with explicit policies:

```bash
lf team assign \
  --team-id <team-id> \
  --workflow-id <workflow-id> \
  --approval-policy human_in_loop \
  --retry-policy '{"maxRetries": 3, "backoffMs": 500}' \
  --failure-policy '{"mode": "isolate"}' \
  --queue-policy '{"mode": "serial"}'
```

### Choosing an approval level

| Level | `--approval-policy` | What it means |
|-------|-------------------|---------------|
| Fully supervised | `fully_supervised` | You approve every node before it runs |
| Human in loop | `human_in_loop` | You approve only sensitive actions (publish, spend, delete) |
| Human on loop | `human_on_loop` | Runs autonomously; you can intervene on flagged steps |
| Fully autonomous | `fully_autonomous` | No approval required; audit after the fact |

> **Recommended for first teams:** `human_in_loop`. You will see what the agents do before outputs go anywhere sensitive, without approving every trivial step.

---

## Step 6 — Trigger a team run

Run the workflow through the team on demand:

```bash
lf team run \
  --team-id <team-id> \
  --workflow-id <workflow-id> \
  --input topic="Latest developments in AI agent frameworks"
```

Or from the web app: AI Workspace → Teams → select team → **Run workflow**.

---

## Step 7 — Handle the approval queue

With `human_in_loop`, any action flagged as sensitive will pause and wait for your decision. Check the queue:

```bash
lf approval list
```

Output example:
```
ID          TEAM            WORKFLOW         GATE              REQUESTED AT
req-001     Research & Write daily-digest     publish_output    3 minutes ago
req-002     Research & Write daily-digest     spend_threshold   2 minutes ago
```

Review a specific request:

```bash
lf approval view req-001
```

This shows:
- Which agent made the request
- What action they want to take
- The proposed payload (e.g., the content they want to publish)

Decide:

```bash
# Approve the request
lf approval approve req-001

# Approve with modifications (e.g., narrow the audience)
lf approval approve req-001 --modify '{"audience": "team-only"}'

# Reject the request
lf approval reject req-001 --reason "Content needs more review"
```

### Mandatory gates

These actions **always** require your approval regardless of autonomy level:

- Creating a new agent
- Adding/removing team members
- Publishing content publicly
- Sending messages to external systems (email, Slack, webhooks)
- Spending credits beyond your configured threshold
- Deleting any data
- Modifying a CRON schedule

---

## Step 8 — Inspect a team run

After the run completes (or while it is running):

```bash
# List runs for your team
lf execution list --team <team-id>

# Inspect the run in detail
lf execution inspect <team-run-id>

# Stream the live event log
lf execution events <team-run-id> --stream
```

The inspect output shows per-step details:
- Which member executed each node
- Input and output at each step
- Approval decisions and timing
- Any blocked nodes and their `waiting_reason`

---

## Step 9 — Handle a blocked node

If no team member is eligible for a node (e.g., no member's tool profile allows the required tools), the node is marked `blocked`:

```bash
lf execution inspect <run-id>
# → Node "validate-output" is blocked: waiting_reason=human_input
```

Options:
1. **Approve manually** — `lf approval approve <approval-id>` to assign a member by hand
2. **Fix the profile** — update the relevant member's tool profile to allow the required tool, then retry
3. **Cancel the run** — `lf run cancel <run-id>`

---

## Step 10 — Inspect the scratchpad

Every team has a scratchpad — a shared working memory that agents use to pass intermediate context across steps:

```bash
lf team inspect --team-id <team-id>
```

The scratchpad resets between runs by default. To persist it, configure the member's memory profile.

---

## What you learned

- The team composition model: members + typed edges + workflow assignment + policy bundle
- How to choose the right autonomy level for your use case
- How to handle approval requests and blocked nodes
- How to inspect team runs and the scratchpad

---

## Next steps

- [CRON Scheduling](/tutorials/agent-walkthroughs/cron-scheduling) — Run team workflows on a recurring schedule
- [Automation Rules](/tutorials/agent-walkthroughs/automation-rules) — Trigger workflows from events, not just manually
- [Executions & Workflow Runs](/explanation/agents/executions) — How runs work end-to-end
- [Agent Teams (explanation)](/explanation/agents/agent-teams) — Full concept reference
- [Approvals (ConnectedLenses)](/connected-lenses/approvals) — Complete approval gate specification
