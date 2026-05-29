---
title: Asana Task Update
description: Updates an existing Asana task.
---

# Asana Task Update

## Overview

The Asana Task Update node modifies an existing Asana task by its task ID, allowing workflows to update fields such as name, description, assignee, due date, completion status, and custom fields. Use it to reflect battle outcomes, sync AI-generated results, or automate project tracking after a workflow execution completes. Requires a valid Asana API credential configured in the workflow's credential store. If the task ID is not found or the API call fails, execution routes to the error output.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Asana API credential (Personal Access Token or OAuth) used to authenticate requests. |
| `taskId` | string | Yes | The GID of the Asana task to update. Supports template expressions (e.g. {{input.taskId}}) to resolve at runtime. |
| `name` | string | No | New name for the task. Leave blank to leave the field unchanged. |
| `notes` | string | No | Updated plain-text description / notes body for the task. |
| `assigneeId` | string | No | GID of the Asana user to assign the task to. Use 'me' to assign to the token owner. |
| `dueOn` | string | No | Due date in ISO 8601 date format (YYYY-MM-DD). Clears the due date when set to an empty string. |
| `completed` | boolean | No | When true, marks the task as complete. When false, marks it as incomplete. |
| `customFields` | object | No | Key/value map of custom field GIDs to their new values (e.g. {"12345": "High"}). |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional payload. Any field can be referenced in config via template expressions (e.g. {{input.taskId}}). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains the full updated task object returned by the Asana API (task GID, name, status, assignee, etc.). |
| `error` | object | Emitted when the API call fails (e.g. invalid task GID, auth error, rate limit). Contains message and HTTP status code. |

## Example

```json
{
  "nodeType": "asana_task_update",
  "config": {
    "credentialId": "cred_asana_prod",
    "taskId": "{{input.asanaTaskId}}",
    "notes": "Battle completed. Winner: {{input.winnerHandle}}. Score: {{input.score}}",
    "completed": true
  }
}
```
