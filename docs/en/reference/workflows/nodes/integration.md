---
title: Integration Nodes | Workflow Node Reference
description: Reference for all Integration nodes in LenserFight Workflow Studio — GitHub, Notion, RSS, Google Sheets, Linear, Jira, and Calendar.
---

# Integration Nodes

Integration nodes connect to third-party platforms and services. Use them to automate PR reviews, feed monitoring, knowledge base updates, issue tracking, and calendar scheduling.

| Node | Type | Output |
|------|------|--------|
| [GitHub Read](#github-read) | `github_read` | `json` |
| [GitHub PR Review](#github-pr-review) | `github_pr_review` | `json` |
| [GitHub Issue Create](#github-issue-create) | `github_issue_create` | `json` |
| [RSS Feed](#rss-feed) | `rss_feed` | `json` |
| [Notion Read](#notion-read) | `notion_read` | `json` |
| [Notion Write](#notion-write) | `notion_write` | `json` |
| [Sheets Read](#google-sheets-read) | `google_sheets_read` | `array` |
| [Sheets Write](#google-sheets-write) | `google_sheets_write` | `json` |
| [Calendar Create](#calendar-create) | `calendar_create` | `json` |
| [Linear Issue Create](#linear-issue-create) | `linear_issue_create` | `json` |
| [Jira Issue Create](#jira-issue-create) | `jira_issue_create` | `json` |

---

## GitHub Read {#github-read}

**Type:** `github_read` · **Category:** Integrations

Read repository, pull request, issue, or file data from GitHub.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `repository` | `string` | `owner/repo` format. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `resource` | `string` | `pull_request` · `issue` · `file` · `commits`. |
| `prNumber` | `number` | PR number (for `pull_request` resource). |
| `credentialsRef` | `secret` | GitHub token secret reference. |

### Example

```json
{
  "repository": "ofcskn/lenserfight-web",
  "resource": "pull_request",
  "prNumber": 42
}
```

**Expected output:** `{ "pullRequest": { "title": "Add workflow catalog", "files": 12 } }`

**Downstream:** → `github_pr_review`

### Related Nodes

[GitHub PR Review](#github-pr-review) · [Summarizer](./ai-primitives#summarizer) · [Webhook Trigger](./trigger#webhook-trigger)

---

## GitHub PR Review {#github-pr-review}

**Type:** `github_pr_review` · **Category:** Integrations

Create or draft a GitHub pull request review from analysis output.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `repository` | `string` | `owner/repo` format. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `prNumber` | `string` | `$.pullRequest.number` | — |
| `reviewBody` | `string` | `$.summary` | — |
| `event` | `string` | `COMMENT` | `COMMENT` · `APPROVE` · `REQUEST_CHANGES` |

### Example

```json
{
  "repository": "ofcskn/lenserfight-web",
  "prNumber": "$.pullRequest.number",
  "reviewBody": "$.summary",
  "event": "COMMENT"
}
```

**Expected output:** `{ "status": "submitted", "reviewId": "PRR_kwDO" }`

**Downstream:** → `slack_notify`

### Valid Connections

→ `slack_notify`, `logger`, `linear_issue_create`

### Related Nodes

[GitHub Read](#github-read) · [Agent Execute](./ai-primitives#agent-execute) · [Summarizer](./ai-primitives#summarizer)

---

## GitHub Issue Create {#github-issue-create}

**Type:** `github_issue_create` · **Category:** Integrations

Create a GitHub issue from workflow output. Use for automated bug reporting, task creation, and workflow failure escalation.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `repository` | `string` | `owner/repo`. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Issue title. |
| `body` | `string` | Issue body or mapping. |
| `labels` | `json` | Label array (e.g. `["workflow", "automation"]`). |

### Example

```json
{
  "repository": "ofcskn/lenserfight-web",
  "title": "Workflow catalog validation failure",
  "body": "$.reasoning",
  "labels": ["workflow", "automation"]
}
```

**Expected output:** `{ "issueNumber": 128, "url": "https://github.com/..." }`

---

## RSS Feed {#rss-feed}

**Type:** `rss_feed` · **Category:** Integrations

Fetch RSS feed items. Use for content monitoring, news aggregation, and changelog tracking.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `feedUrl` | `string` | RSS feed URL. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `limit` | `number` | `10` |
| `since` | `string` | — | ISO timestamp to filter items newer than. |

### Example

```json
{
  "feedUrl": "https://github.blog/feed/",
  "limit": 10,
  "since": "$.lastSuccessfulRun"
}
```

**Expected output:** `{ "items": [{ "title": "Actions update", "link": "https://github.blog/..." }] }`

**Downstream:** → `summarizer`

### Valid Connections

→ `summarizer`, `email_send`, `slack_notify`, `filter_items`, `deduplicate`

---

## Notion Read {#notion-read}

**Type:** `notion_read` · **Category:** Integrations

Read Notion pages or database rows.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `databaseId` | `string` | Notion database id or secret reference. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `filter` | `json` | Notion filter object. |

### Example

```json
{
  "databaseId": "{{secrets.notionDigestDb}}",
  "filter": { "property": "Status", "equals": "Ready" }
}
```

**Expected output:** `{ "results": [{ "title": "Arena notes" }] }`

**Downstream:** → `summarizer`

---

## Notion Write {#notion-write}

**Type:** `notion_write` · **Category:** Integrations

Write a Notion page or database row.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `databaseId` | `string` | Notion database id. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `properties` | `json` | Page properties mapping. |

### Example

```json
{
  "databaseId": "{{secrets.notionDigestDb}}",
  "properties": { "Name": "$.title", "Summary": "$.summary" }
}
```

**Expected output:** `{ "pageId": "notion_page_123", "url": "https://notion.so/..." }`

---

## Sheets Read {#google-sheets-read}

**Type:** `google_sheets_read` · **Category:** Integrations

Read rows from a Google Sheet.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `spreadsheetId` | `string` | Sheet id or secret reference. |

### Optional Config

| Field | Type | Default |
|-------|------|---------|
| `sheetName` | `string` | — |
| `range` | `string` | `A1` |
| `valueRenderOption` | `string` | `FORMATTED_VALUE` |

### Example

```json
{
  "spreadsheetId": "{{secrets.weeklyMetricsSheet}}",
  "sheetName": "Battle Metrics",
  "range": "A2:G200",
  "valueRenderOption": "FORMATTED_VALUE"
}
```

**Expected output:** `{ "rows": [{ "battleId": "battle_123", "score": 91 }] }`

**Downstream:** → `aggregate`

---

## Sheets Write {#google-sheets-write}

**Type:** `google_sheets_write` · **Category:** Integrations

Append or update rows in a Google Sheet.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `spreadsheetId` | `string` | Sheet id or secret reference. |

### Optional Config

| Field | Type | Default | Options |
|-------|------|---------|---------|
| `sheetName` | `string` | — | — |
| `operation` | `string` | `append` | `append` · `update` |
| `rowsPath` | `string` | `$.rows` | — |

### Example

```json
{
  "spreadsheetId": "{{secrets.weeklyMetricsSheet}}",
  "sheetName": "Digest Log",
  "operation": "append",
  "rowsPath": "$.rows"
}
```

**Expected output:** `{ "updatedRows": 3 }`

---

## Calendar Create {#calendar-create}

**Type:** `calendar_create` · **Category:** Integrations

Create a calendar event using Google Calendar.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `calendarId` | `string` | Calendar id (e.g. `primary`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Event title. |
| `start` | `string` | ISO 8601 start time. |
| `end` | `string` | ISO 8601 end time. |
| `attendees` | `json` | Attendee email array. |

### Example

```json
{
  "calendarId": "primary",
  "title": "Arena digest review",
  "start": "2026-05-18T10:00:00+03:00",
  "end": "2026-05-18T10:30:00+03:00",
  "attendees": ["founder@example.com"]
}
```

---

## Linear Issue Create {#linear-issue-create}

**Type:** `linear_issue_create` · **Category:** Integrations

Create a Linear issue from workflow output.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `teamId` | `string` | Linear team id or secret reference. |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Issue title. |
| `description` | `string` | Issue description or mapping. |
| `priority` | `number` | `1` (urgent) to `4` (low). |

### Example

```json
{
  "teamId": "{{secrets.linearTeamId}}",
  "title": "Investigate low-confidence judge result",
  "description": "$.reasoning",
  "priority": 2
}
```

---

## Jira Issue Create {#jira-issue-create}

**Type:** `jira_issue_create` · **Category:** Integrations

Create a Jira issue from workflow output.

### Required Config

| Field | Type | Description |
|-------|------|-------------|
| `projectKey` | `string` | Jira project key (e.g. `LF`). |

### Optional Config

| Field | Type | Description |
|-------|------|-------------|
| `issueType` | `string` | `Task` · `Bug` · `Story` |
| `summary` | `string` | Issue summary. |
| `description` | `string` | Description or mapping. |

### Example

```json
{
  "projectKey": "LF",
  "issueType": "Task",
  "summary": "Workflow validation warning",
  "description": "$.warning"
}
```

---

**See also:** [Node Catalog Index](./) · [Storage Nodes](./storage) · [Communication Nodes](./communication) · [Workflow Studio](/en/how-to/agents/workspace/workflows)
