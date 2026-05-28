---
kind: workflow
schema_version: 1
id: wf_community_chat_summary
slug: chat-summary
name: Chat Summary
description: Summarize a chat transcript into a structured digest with action items, decisions, and open questions.
owner:
  workspace_id: ws_community
visibility: public
version: 0.1.0
status: draft
workflow_type: manual
triggers:
  - type: manual
steps:
  - id: ingest
    type: agent_task
    agent_ref: agent_chat_ingestor
  - id: summarize
    type: agent_task
    agent_ref: agent_summarizer
    depends_on:
      - ingest
  - id: extract_actions
    type: agent_task
    agent_ref: agent_action_extractor
    depends_on:
      - summarize
  - id: format_report
    type: agent_task
    agent_ref: agent_report_formatter
    depends_on:
      - summarize
      - extract_actions
tags:
  - community-template
  - communication
---

# Purpose

Take a raw chat transcript (Slack, Discord, generic IRC dump) and produce a short digest a non-participant can read in under a minute. Surfaces decisions, action items, and open questions.

# Inputs

| Input | Type | Required | Notes |
|---|---|---|---|
| `transcript` | string | yes | Raw transcript text. UTF-8. No length cap, but practical limit ~50k chars. |
| `audience` | string | no | Defaults to `team`. Other valid values: `executive`, `external`. Controls tone of the final report. |
| `focus` | string | no | Optional topic hint. When set, the summarizer biases toward content matching the topic. |

The `transcript` input is the only required field. Validation: non-empty string.

# Steps

1. **`ingest`** — normalizes the transcript: strips bot noise, collapses repeated joins/leaves, identifies distinct speakers. Outputs a structured `messages[]` array.
2. **`summarize`** — produces a 3–5 sentence narrative summary keyed to the `audience` input. Failures: returns a single-sentence "no consensus reached" summary rather than aborting.
3. **`extract_actions`** — pulls action items, decisions, and open questions into three lists. Each item is keyed back to a message index.
4. **`format_report`** — combines the summary and the three lists into a Markdown report. Renders without action items if the extractor returned an empty list.

Retry policy: each step has 2 attempts on `provider_error` or `rate_limit`. Other failures propagate.

# Outputs

| Output | Type | Notes |
|---|---|---|
| `report` | markdown string | The user-facing digest. |
| `messages` | json | The normalized transcript (debug aid). |
| `actions` | json | Action items as `{ owner, item, message_index }`. |
| `decisions` | json | Decisions as `{ summary, message_index }`. |
| `open_questions` | json | Open questions as `{ question, message_index }`. |

The `report` output is the one most users surface. The structured outputs are available for downstream automation.
