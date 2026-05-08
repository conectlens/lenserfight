---
kind: workflow
schema_version: 1
id: wf_community_daily_digest
slug: daily-digest
name: Daily Digest
description: Aggregate items from one or more sources into a single end-of-day digest delivered on a schedule.
owner:
  workspace_id: ws_community
visibility: public
version: 0.1.0
status: draft
workflow_type: scheduled
triggers:
  - type: schedule
    cron: "0 17 * * 1-5"
steps:
  - id: collect
    type: agent_task
    agent_ref: agent_source_collector
  - id: dedupe
    type: agent_task
    agent_ref: agent_deduper
    depends_on:
      - collect
  - id: rank
    type: agent_task
    agent_ref: agent_ranker
    depends_on:
      - dedupe
  - id: write_digest
    type: agent_task
    agent_ref: agent_digest_writer
    depends_on:
      - rank
tags:
  - community-template
  - productivity
---

# Purpose

Produce a daily digest of items pulled from one or more configured sources (RSS feeds, GitHub notifications, custom URLs). Designed to run on a schedule so the digest is waiting at the end of the working day.

# Inputs

| Input | Type | Required | Notes |
|---|---|---|---|
| `sources` | string[] | yes | List of source identifiers. Each must resolve to a configured source in the agent's tool profile. |
| `max_items` | int | no | Defaults to 10. Caps the number of items in the final digest. |
| `lookback_hours` | int | no | Defaults to 24. How far back the collector looks. |
| `audience` | string | no | Defaults to `self`. Controls tone of the digest. |

The schedule defaults to weekdays at 17:00 in the workspace's timezone. Change the `cron` field in the frontmatter to override.

# Steps

1. **`collect`** — fetches items from each `source`. Tolerates per-source failures; a failed source contributes zero items rather than aborting.
2. **`dedupe`** — collapses near-duplicates by URL canonicalization plus title similarity.
3. **`rank`** — orders items by a relevance heuristic (recency × source weight × topic match if `focus` was supplied at run time).
4. **`write_digest`** — produces the Markdown digest with section headers per source and a top-of-page TL;DR.

Retry policy: `collect` retries individual source fetches up to 3 times with exponential backoff. Other steps retry once on `provider_error`.

# Outputs

| Output | Type | Notes |
|---|---|---|
| `digest` | markdown string | The user-facing digest. |
| `items` | json | Raw collected items, post-dedupe, with rank scores attached. |
| `dropped_sources` | string[] | Sources that failed to fetch — surfaced so operators can fix configuration. |

Approval is not required by default — this is a read-only workflow. If `approval_policy.requiresApproval=true` is set on the schedule, the digest waits for owner approval before delivery.
