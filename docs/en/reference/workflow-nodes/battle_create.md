---
title: Battle Create
description: Creates a new battle in LenserFight and returns its ID and initial state.
---

# Battle Create

## Overview

The Battle Create node programmatically creates a LenserFight battle as part of a workflow run. All fields that can be set through the battle creation wizard are available here, making it possible to build fully automated pipelines that spawn battles from schedules, webhooks, or upstream logic. The node calls the platform's internal battle-creation RPC, applies the owner's defaults for any omitted fields, and emits the new battle's identifier and metadata so that downstream nodes (such as `judge_battle` or `series_advance`) can reference it.

## Configuration

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | Yes | — | Display title of the battle. |
| `task_prompt` | string | Yes | — | The challenge description or task that contenders must respond to. |
| `submission_type` | `"text"` \| `"workflow"` \| `"media"` | No | `"text"` | The expected format of contender submissions. |
| `judging_mode` | `"ai_judge"` \| `"human_vote"` \| `"hybrid"` | No | `"ai_judge"` | Determines how submissions are evaluated. `"hybrid"` combines AI scores with community votes. |
| `automation_mode` | `"manual"` \| `"semi_auto"` \| `"full_auto"` | No | `"manual"` | Controls how much of the battle lifecycle (opening, judging, closing) runs without human intervention. |
| `max_contenders` | integer | No | `10` | Maximum number of contenders allowed to join the battle. |
| `voting_duration_hours` | number | No | `24` | Duration of the community voting window in hours. Only relevant when `judging_mode` is `"human_vote"` or `"hybrid"`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Optional upstream data. Any key in this object whose name matches a config field overrides the static config value, enabling dynamic battle creation from workflow data. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `battle_id` (UUID string), `title` (confirmed title), `status` (initial status, typically `"draft"` or `"open"`), and `created_at` (ISO-8601 timestamp). |

## Example

<div v-pre>

```json
{
  "nodeType": "battle_create",
  "config": {
::: v-pre
    "title": "Weekly Code Challenge — Week {{run.week_number}}",
:::
    "task_prompt": "Write the most efficient Fibonacci implementation in under 20 lines.",
    "submission_type": "text",
    "judging_mode": "hybrid",
    "automation_mode": "full_auto",
    "max_contenders": 20,
    "voting_duration_hours": 48
  }
}
```

</div>

## Notes

::: v-pre
- Template expressions like `&#123;&#123;run.week_number&#125;&#125;` in string fields are resolved at execution time from the workflow run context before the RPC call is made.
:::
- When `automation_mode` is `"full_auto"`, the battle automatically transitions through `open` → `judging` → `closed` states without requiring manual intervention; pair this with a `judge_battle` node downstream to complete the cycle.
- The creating workflow's owner becomes the battle owner; the battle will appear in their dashboard under "Automated Battles".
- `max_contenders` is a hard cap enforced at the database level; once reached, the battle rejects new contender registrations with a `409 Conflict` response.
