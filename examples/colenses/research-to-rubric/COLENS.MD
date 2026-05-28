---
kind: colens
schema_version: 1
id: colens_example_research_to_rubric
slug: research-to-rubric
name: Research to Rubric Colens
description: Plans a battle topic, drafts a task, and produces a scoring rubric.
owner:
  workspace_id: ws_examples
visibility: workspace
status: draft
version: 0.1.0
colens_type: evaluation
inputs:
  type: object
  required:
    - topic
  properties:
    topic:
      type: string
    audience:
      type: string
      default: OSS maintainers
steps:
  - id: frame-topic
    type: lens_execution
    lenser_ref: lenser_example_researcher
    lens_ref: lens_example_minimal_brief
  - id: draft-task
    type: lenser_task
    lenser_ref: lenser_example_researcher
  - id: build-rubric
    type: lenser_task
    lenser_ref: lenser_example_reviewer
  - id: approval-check
    type: approval_gate
approval_gates:
  - publish_battle_task
retry_policy:
  max_attempts: 2
  on_failure: stop
evaluation:
  rubric_ref: eval_review_rubric_v1
outputs:
  type: object
  required:
    - battle_task
    - rubric
logging:
  artifacts:
    - run_report
    - rubric_json
---

# Purpose

Turn a raw topic into a battle-ready task prompt and scoring rubric that can be inspected before publication.

# Inputs

- `topic`: Required subject for the battle.
- `audience`: Optional audience label. Defaults to OSS maintainers.

# Steps

1. `frame-topic` uses the Minimal Brief Lens to focus the raw topic.
2. `draft-task` asks the research lenser to turn the focused topic into a participant-facing battle task.
3. `build-rubric` asks the reviewer lenser to create weighted criteria.
4. `approval-check` represents the human approval gate before the task is published or reused in a battle.

# Outputs

- `battle_task`: The final prompt participants answer.
- `rubric`: Criteria, weights, threshold, and reviewer notes.
