---
title: Asana Task Create
description: Creates a new task in Asana.
---

# Asana Task Create

## Overview

The Asana Task Create node creates a new task in a specified Asana project using the Asana REST API. It requires an Asana personal access token or OAuth credential configured in the workflow's credential store. Use this node when a battle outcome, workflow step, or external trigger should produce a trackable action item in Asana. If the API call fails (e.g. invalid project GID, auth error, rate limit), the node emits on the error port with the raw API error details.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Asana credential (personal access token or OAuth2 connection) used to authenticate API requests. |
| `projectGid` | string | Yes | The GID of the Asana project where the task will be created. Found in the project URL. |
| `taskName` | string | Yes | Name of the task to create. Supports template expressions (e.g. `input.battleTitle` placeholders) to inject upstream data. |
| `description` | string | No | Plain-text or HTML notes for the task body. Supports template expressions. |
| `assigneeEmail` | string | No | Email address of the Asana workspace member to assign the task to. If omitted, the task is unassigned. |
| `dueOn` | string | No | Due date in YYYY-MM-DD format. Supports template expressions for dynamic dates. |
| `priority` | enum | No | Maps to a custom field or tag representing priority. Accepted values: low, medium, high. |
| `sectionGid` | string | No | GID of the project section to place the task in. If omitted, the task lands in the default section. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and contextual data from the upstream node. Fields are accessible in template expressions throughout the config. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful task creation. Contains the created task object returned by the Asana API, including gid, name, permalink_url, and created_at. |
| `error` | object | Emitted when the Asana API returns an error or the request fails. Contains statusCode, message, and the raw API error body. |

## Example

<div v-pre>

```json
{
  "nodeType": "asana_task_create",
  "config": {
    "credentialId": "cred_asana_prod_01",
    "projectGid": "1204872349812340",
    "taskName": "Review battle result: {{input.battleTitle}}",
    "description": "Battle completed on {{input.completedAt}}.\nWinner: {{input.winner}}\nScore: {{input.score}}",
    "assigneeEmail": "team-lead@example.com",
    "dueOn": "{{input.reviewDeadline}}"
  }
}
```

</div>
