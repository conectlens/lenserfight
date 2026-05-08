---
kind: workflow
schema_version: 1
id: wf_community_news_monitor
slug: news-monitor
name: News Monitor
description: Watch one or more news sources for keyword matches and surface alerts when matching articles appear.
owner:
  workspace_id: ws_community
visibility: public
version: 0.1.0
status: draft
workflow_type: scheduled
triggers:
  - type: schedule
    cron: "*/30 * * * *"
steps:
  - id: fetch
    type: agent_task
    agent_ref: agent_news_fetcher
  - id: filter
    type: agent_task
    agent_ref: agent_keyword_filter
    depends_on:
      - fetch
  - id: deduplicate_against_history
    type: agent_task
    agent_ref: agent_history_deduper
    depends_on:
      - filter
  - id: alert
    type: agent_task
    agent_ref: agent_alert_dispatcher
    depends_on:
      - deduplicate_against_history
tags:
  - community-template
  - research
---

# Purpose

Monitor a set of news sources at a scheduled cadence (default: every 30 minutes). When an article matches one of the configured keywords and has not been seen before, raise an alert. Designed to run autonomously with the deduplication step preventing duplicate alerts.

# Inputs

| Input | Type | Required | Notes |
|---|---|---|---|
| `sources` | string[] | yes | List of source identifiers (RSS, configured news API). |
| `keywords` | string[] | yes | At least one keyword. Matched case-insensitively against title and lead. |
| `excluded_keywords` | string[] | no | Negative filter applied after positive matches. |
| `min_score` | number | no | Defaults to 0.5. Cutoff for the relevance ranker. |
| `delivery_target` | string | no | Defaults to `agent_inbox`. Other valid values match the agent's configured tool profile. |

# Steps

1. **`fetch`** — pulls the latest items from each source. Per-source failures are tolerated; a missing source results in zero new items, not an abort.
2. **`filter`** — keeps items whose title or lead matches at least one `keyword` and none of the `excluded_keywords`.
3. **`deduplicate_against_history`** — checks the agent's memory for previously-alerted URLs and drops any item already seen in the lookback window (default 7 days).
4. **`alert`** — for each surviving item, dispatches an alert through the `delivery_target` tool. **Sending is a write-class action and requires owner approval** unless the agent's tool profile pre-grants the delivery target.

Retry policy: `fetch` retries individual sources up to 3 times. `alert` does not retry — failed deliveries are surfaced for manual review rather than re-attempted, to avoid double alerts.

# Outputs

| Output | Type | Notes |
|---|---|---|
| `alerts` | json | Items that triggered an alert, with their match keywords and dispatch status. |
| `dropped_duplicates` | json | Items that matched keywords but were dropped as duplicates (debug aid). |
| `dropped_sources` | string[] | Sources that failed to fetch. |

Set the schedule's `approval_policy.requiresApproval=true` on the first few runs to verify keyword tuning. Once the alert volume looks right, switch to `autonomous_with_gates` so alerts dispatch without per-run approval — the `alert` step still requires per-target approval if the delivery target is not pre-granted.
