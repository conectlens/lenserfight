---
title: Monday Item Update
description: Updates an existing item on a Monday.com board.
---

# Monday Item Update

## Overview

The Monday Item Update node updates an existing item on a Monday.com board by writing new column values to a specified item ID. It requires a Monday.com API credential and a valid item ID, which can be sourced dynamically from upstream nodes. If the update fails — due to an invalid item ID, insufficient permissions, or API error — execution is routed to the error output so downstream nodes can handle or log the failure.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Monday.com API credential (OAuth token or API key) used to authenticate requests. |
| `boardId` | string | Yes | The Monday.com board ID that contains the item to update. |
| `itemId` | string | Yes | The ID of the item to update. Accepts a literal value or a template expression referencing an upstream output (e.g. {{trigger.itemId}}). |
| `columnValues` | object | Yes | Key-value map of column IDs to their new values. Values must conform to Monday.com column-type formats (e.g. {"status": {"label": "Done"}, "date": {"date": "2026-05-29"}}). |
| `createLabelsIfMissing` | boolean | No | When true, automatically creates status/dropdown labels that do not yet exist on the board instead of returning an error. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Triggers the update operation. Passes through the upstream execution context, which can supply dynamic values for itemId or columnValues via template expressions. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains the updated item's ID, board ID, and the resolved column values returned by the Monday.com API. |
| `error` | object | Emitted when the update fails. Contains an error code, message, and the original request payload for debugging or retry logic. |

## Example

```json
{
  "nodeType": "monday_item_update",
  "config": {
    "credentialId": "cred_monday_prod",
    "boardId": "3842910175",
    "itemId": "{{execution.context.mondayItemId}}",
    "columnValues": {
      "status": {
        "label": "In Review"
      },
      "date4": {
        "date": "2026-05-29"
      },
      "text_notes": "Auto-updated by LenserFight battle result"
    }
  }
}
```
