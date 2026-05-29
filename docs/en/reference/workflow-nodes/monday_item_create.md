---
title: Monday Item Create
description: Creates a new item on a Monday.com board.
---

# Monday Item Create

## Overview

The Monday Item Create node creates a new item in a specified Monday.com board and group using the Monday.com API. It requires a valid Monday.com API credential and accepts dynamic column values to populate the item at creation time. Use this node when a workflow needs to log results, create tasks, or track battle outcomes directly in a Monday.com board. On API failure the node emits on the `error` output so downstream error-handling logic can respond without halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Monday.com API credential (OAuth or personal API token) used to authenticate requests. |
| `boardId` | string | Yes | Numeric ID of the Monday.com board where the item will be created. Accepts a static value or a template expression referencing upstream data. |
| `groupId` | string | No | ID of the group within the board to add the item to. Defaults to the board's first group when omitted. |
| `itemName` | string | Yes | Display name of the new item. Supports template expressions (e.g. `{{battle.title}}`). |
| `columnValues` | object | No | Key-value map of Monday.com column IDs to their values, serialized as the Monday.com column_values JSON structure. Used to populate status, date, text, or people columns at creation time. |
| `createLabelsIfMissing` | boolean | No | When true, automatically creates missing status or dropdown labels instead of failing. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal and upstream workflow data. Values from this payload are available as template expressions in `itemName` and `columnValues`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains the created item's `id`, `name`, `board.id`, and `group.id` as returned by the Monday.com API. |
| `error` | object | Emitted when the API call fails (authentication error, invalid board/group ID, column value schema mismatch, or rate limit exceeded). Contains `message` and `code` fields. |

## Example

```json
{
  "nodeType": "monday_item_create",
  "config": {
    "credentialId": "cred_monday_prod",
    "boardId": "3847201956",
    "groupId": "new_group",
    "itemName": "Battle Result: {{battle.title}} — {{execution.finishedAt}}",
    "columnValues": {
      "status": {
        "label": "Done"
      },
      "date4": {
        "date": "{{execution.finishedAt | date('YYYY-MM-DD')}}"
      },
      "text_column": "{{winner.handle}}"
    },
    "createLabelsIfMissing": false
  }
}
```
