---
title: Jira Issue Create
description: Creates a new issue in a Jira project.
---

# Jira Issue Create

## Overview

The Jira Issue Create node creates a new issue in a specified Jira project using the Jira REST API v3. It requires a configured Jira credential (API token + base URL) and maps workflow data to Jira fields such as summary, description, issue type, and priority. On success it emits the created issue's key and URL; on failure it routes to the error output so downstream nodes can handle or log the rejection without halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Jira credential (API token + account email + base URL) used to authenticate requests. |
| `projectKey` | string | Yes | The Jira project key (e.g. ENG, OPS) where the issue will be created. |
| `issueType` | enum | Yes | Type of issue to create. Accepted values: Bug, Task, Story, Epic, Sub-task. |
| `summary` | string | Yes | Issue title. Supports template expressions (e.g. {{input.title}}) resolved at runtime. |
| `description` | string | No | Issue body in Jira Document Format (ADF) or plain text. Template expressions are resolved before sending. |
| `priority` | enum | No | Issue priority. Accepted values: Highest, High, Medium, Low, Lowest. Defaults to Medium when omitted. |
| `assigneeAccountId` | string | No | Jira account ID of the user to assign the issue to. Leave blank to leave unassigned. |
| `labels` | string | No | Comma-separated list of labels to attach to the issue (e.g. automation,lenserfight). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional payload. Fields from this object can be referenced in summary, description, and other template-enabled config fields. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful issue creation. Contains issueKey (e.g. ENG-42), issueId, and self (the full Jira issue URL). |
| `error` | object | Emitted when the Jira API returns a non-2xx response or a network/auth failure occurs. Contains statusCode, message, and the original request payload for debugging. |

## Example

```json
{
  "nodeType": "jira_issue_create",
  "config": {
    "credentialId": "cred_jira_prod",
    "projectKey": "ENG",
    "issueType": "Bug",
    "summary": "Battle execution failure: {{input.battleId}}",
    "description": "Automated report.\n\nBattle: {{input.battleId}}\nError: {{input.errorMessage}}",
    "priority": "High",
    "labels": "automation,battle-failures"
  }
}
```
