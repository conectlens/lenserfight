---
title: Notion Read
description: Reads a page or database from Notion.
---

# Notion Read

## Overview

The Notion Read node fetches the content of a Notion page or the rows of a Notion database using the Notion API. It requires a Notion integration token configured at the workflow or account level. Use it to pull structured data (database query results) or rich-text page content into a battle workflow — for example, seeding a battle prompt from a Notion doc or retrieving evaluation criteria stored in a Notion table. If the page or database is not found, access is denied, or the API returns an error, execution routes to the error output port.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `resource_type` | enum (page | database) | Yes | Whether to read a single Notion page or query a full database. |
| `resource_id` | string | Yes | The Notion page ID or database ID to read. Accepts the UUID form (with or without hyphens) or a full Notion URL. |
| `filter` | object | No | A Notion filter object applied when resource_type is database. Follows the Notion API filter schema (e.g. {property, rich_text, contains}). |
| `sorts` | array | No | An array of Notion sort descriptors applied when resource_type is database. Each entry specifies a property name and direction (ascending | descending). |
| `page_size` | number | No | Maximum number of results to return for a database query. Defaults to 100; maximum is 100 per the Notion API. |
| `credential_id` | string | No | ID of the stored Notion integration credential to use. Falls back to the workflow-level default credential when omitted. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the read operation. Carries workflow context; any payload fields are available for dynamic expression interpolation in config values (e.g. injecting a resource_id at runtime). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. For a page, contains the Notion page object including properties and rich-text content blocks. For a database, contains a results array of page objects matching the query, plus has_more and next_cursor fields for pagination. |
| `error` | object | Emitted when the Notion API returns an error (e.g. 404 not found, 403 insufficient permissions, 429 rate-limited, or network failure). Contains code, message, and status fields. |

## Example

```json
{
  "nodeType": "notion_read",
  "config": {
    "resource_type": "database",
    "resource_id": "1a2b3c4d-5e6f-7890-abcd-ef1234567890",
    "filter": {
      "property": "Status",
      "select": {
        "equals": "Published"
      }
    },
    "page_size": 50
  }
}
```
