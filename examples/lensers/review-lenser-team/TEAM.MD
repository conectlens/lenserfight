---
kind: team
schema_version: 1
id: team_example_review_ops
slug: example-review-ops
name: Example Review Ops Team
description: Coordinates a researcher and rubric reviewer for battle preparation.
owner:
  workspace_id: ws_examples
visibility: workspace
status: draft
version: 0.1.0
purpose: Produce battle-ready prompts and rubrics with a human approval gate.
team_lead_lenser: lenser_example_researcher
members:
  - lenser_id: lenser_example_researcher
    agent_id: lenser_example_researcher
    role: research_lead
    responsibilities:
      - frame topic
      - draft battle task
  - lenser_id: lenser_example_reviewer
    agent_id: lenser_example_reviewer
    role: rubric_reviewer
    responsibilities:
      - design criteria
      - flag scoring ambiguity
shared_tools:
  - local.notes.read
colens_ownership:
  - colens_example_research_to_rubric
---

# Team Purpose

Prepare local evaluation material before a battle is opened or simulated.

# LENSERS

- `lenser_example_researcher`: owns topic framing and task drafting.
- `lenser_example_reviewer`: owns rubric clarity and scoring risk.

# Collaboration Rules

The researcher drafts first. The reviewer responds with rubric criteria and unresolved ambiguity. The team stops at the approval gate before anything is published or reused as an authoritative result.
