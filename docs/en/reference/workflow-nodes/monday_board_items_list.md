---
title: Monday Board Items List
description: Lists all items on a Monday.com board.
---

# Monday Board Items List

## Overview

The Monday Board Items List node retrieves all items from a specified Monday.com board, returning them as a structured array for downstream processing. Use it to feed battle contender lists, trigger automation based on board state, or synchronize Monday.com task data into a LenserFight workflow. Requires a valid Monday.com API credential configured in the workflow's credential store. If the board is inaccessible or the API call fails, execution routes to the error output.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Monday.com API credential used to authenticate requests. |
| `boardId` | string | Yes | The numeric ID of the Monday.com board to list items from. |
| `columnValues` | boolean | No | When true, includes all column values for each item in the response payload. Increases response size; disable if only item IDs or names are needed. |
| `limit` | number | No | Maximum number of items to return per request. Defaults to 50. Monday.com enforces a maximum of 500 per page. |
| `groupId` | string | No | If set, restricts results to items belonging to the specified group within the board. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the board items fetch. Passes through any upstream context payload unchanged. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object[] | Array of Monday.com item objects. Each item includes at minimum id, name, and group; column values are included when columnValues is enabled. |
| `error` | object | Emitted when the API call fails (auth error, invalid board ID, rate limit, network timeout). Contains code, message, and the original upstream context. |

## Example

```json
{
  "nodeType": "monday_board_items_list",
  "config": {
    "credentialId": "monday-prod-api-key",
    "boardId": "1234567890",
    "columnValues": true,
    "limit": 100
  }
}
```
