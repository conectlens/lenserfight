---
title: Notion Write
description: Creates or updates a Notion page.
---

# Notion Write

## Overview

The Notion Write node creates a new page or updates an existing page in a Notion workspace using the Notion API. It requires a valid Notion integration token and a target database or parent page ID. On success it emits the resulting page object; on failure it routes to the error port so downstream nodes can handle API or permission errors without halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `integration_token` | string | Yes | Notion internal integration secret (Bearer token). Store in workflow credentials — never hard-code. |
| `operation` | enum | Yes | Action to perform: 'create' inserts a new page under the target; 'update' patches an existing page by ID. |
| `target_id` | string | Yes | For 'create': the parent database ID or parent page ID. For 'update': the existing page ID to modify. |
| `properties` | object | Yes | Key/value map of Notion page properties to write. Keys must match the property names defined in the target database schema (e.g. Title, Status, Tags). |
| `content_blocks` | array | No | Optional list of Notion block objects appended as the page body. Accepts any valid Notion block type (paragraph, heading_1, callout, etc.). |
| `icon` | object | No | Optional page icon. Accepts a Notion emoji object ({ type: 'emoji', emoji: '🚀' }) or an external URL object. |
| `archived` | boolean | No | When true, marks the target page as archived. Only relevant for the 'update' operation. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional dynamic payload. Fields in the payload can be referenced via template expressions in 'properties' or 'content_blocks' to inject runtime values into the page. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The full Notion page object returned by the API after a successful create or update, including the page ID, URL, and resolved properties. |
| `error` | object | Emitted when the Notion API returns an error (e.g. invalid credentials, missing permissions, schema mismatch, or rate limit exceeded). Contains 'code', 'message', and the original 'status' from the API response. |

## Example

```json
{
  "nodeType": "notion_write",
  "config": {
    "integration_token": "{{credentials.notion_token}}",
    "operation": "create",
    "target_id": "1a2b3c4d-5e6f-7890-abcd-ef1234567890",
    "properties": {
      "Name": {
        "title": [
          {
            "text": {
              "content": "{{input.battle_title}}"
            }
          }
        ]
      },
      "Status": {
        "select": {
          "name": "Published"
        }
      },
      "Score": {
        "number": "{{input.final_score}}"
      }
    }
  }
}
```
