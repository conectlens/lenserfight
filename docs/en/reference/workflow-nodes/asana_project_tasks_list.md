---
title: Asana Project Tasks List
description: Lists all tasks in an Asana project.
---

# Asana Project Tasks List

## Overview

The Asana Project Tasks List node retrieves all tasks belonging to a specified Asana project and emits them as an array for downstream processing. It requires a valid Asana API credential and a target project identifier. Use it to feed task data into battle workflows, scoring pipelines, or reporting steps. If the project is not found or the credential lacks access, the node routes to the error output.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credential_id` | string | Yes | ID of the stored Asana OAuth or Personal Access Token credential used to authenticate API requests. |
| `project_id` | string | Yes | The Asana project GID (globally unique identifier) whose tasks will be listed. |
| `completed_since` | string | No | ISO 8601 datetime string. When set, only tasks completed on or after this date are returned. Omit to include all tasks regardless of completion. |
| `opt_fields` | string | No | Comma-separated list of additional Asana task fields to include in each result (e.g. 'assignee,due_on,notes'). Defaults to 'gid,name,completed'. |
| `limit` | number | No | Maximum number of tasks to return per execution. Defaults to 100. Asana pagination is handled automatically up to this cap. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the task listing request. Accepts any upstream data; the payload is not forwarded to Asana but continues to the output alongside the fetched tasks. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object[] | Array of Asana task objects for the specified project. Each item contains at minimum 'gid', 'name', and 'completed', plus any fields requested via opt_fields. |
| `error` | object | Emitted when the request fails (e.g. invalid project ID, expired credential, network error, or Asana rate limit). Contains 'message', 'status', and 'code' fields. |

## Example

```json
{
  "nodeType": "asana_project_tasks_list",
  "config": {
    "credential_id": "cred_asana_prod_01",
    "project_id": "1204567890123456",
    "opt_fields": "gid,name,completed,assignee,due_on",
    "limit": 200
  }
}
```
