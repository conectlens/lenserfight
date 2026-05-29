---
title: Linear Issue Create
description: Creates an issue in a Linear project.
---

# Linear Issue Create

## Overview

The Linear Issue Create node calls the Linear API to create a new issue in a specified team and project, then emits the created issue object downstream. It requires a Linear API credential configured in the workflow's secrets, and the team must exist before execution. If creation fails (e.g. invalid team ID, auth error, or API rate limit), the node routes execution to the error output port instead of halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Linear API key credential used to authenticate requests. |
| `teamId` | string | Yes | Linear team ID where the issue will be created. Found in team settings. |
| `projectId` | string | No | Optional Linear project ID to associate the issue with a specific project inside the team. |
| `title` | string | Yes | Title of the issue. Supports template expressions (e.g. {{input.battleTitle}}). |
| `description` | string | No | Markdown body for the issue. Supports template expressions. |
| `priority` | enum | No | Issue priority: no_priority, urgent, high, medium, or low. Defaults to no_priority. |
| `assigneeId` | string | No | Linear user ID to assign the issue to on creation. |
| `labelIds` | string | No | Comma-separated list of Linear label IDs to attach to the issue. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and payload from the previous node. Values are available as template variables in title, description, and other config fields. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The created Linear issue object, including id, identifier, title, url, and state fields. |
| `error` | object | Emitted when issue creation fails. Contains message, statusCode, and the original input payload. |

## Example

```json
{
  "nodeType": "linear_issue_create",
  "config": {
    "credentialId": "cred_linear_prod",
    "teamId": "TEAM-abc123",
    "title": "Battle failed: {{input.battleTitle}}",
    "description": "Execution `{{input.executionId}}` ended with status `{{input.status}}`.\n\nSee battle: {{input.battleUrl}}",
    "priority": "high"
  }
}
```
