---
title: Google Sheets Read
description: Reads rows from a Google Sheets spreadsheet.
---

# Google Sheets Read

## Overview

The Google Sheets Read node fetches rows from a specified Google Sheets spreadsheet and emits them as structured data for downstream nodes. It requires a connected Google Sheets credential and resolves the target sheet by spreadsheet ID and optional sheet name. Rows are returned as an array of objects keyed by the header row values. If the sheet is unreachable, the credential is invalid, or the specified range contains no data, execution routes to the error output.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credential_id` | string | Yes | ID of the stored Google OAuth2 credential used to authenticate with the Sheets API. |
| `spreadsheet_id` | string | Yes | The unique identifier of the Google Sheets spreadsheet, found in its URL. |
| `sheet_name` | string | No | Name of the specific sheet tab to read. Defaults to the first sheet if omitted. |
| `range` | string | No | A1 notation range to read (e.g. A1:D100). Reads all used rows when omitted. |
| `has_header_row` | boolean | No | When true, treats the first row as column headers and returns rows as key-value objects. Defaults to true. |
| `max_rows` | number | No | Maximum number of data rows to return. Useful for preventing runaway memory use on large sheets. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the read operation. Passed-through data is not used by this node but is available to downstream nodes. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object[] | Array of row objects where each key corresponds to a header column and each value is the cell content. Emitted on successful read. |
| `error` | object | Emitted when the read fails — e.g. invalid credential, spreadsheet not found, or API quota exceeded. Contains message and status_code fields. |

## Example

```json
{
  "nodeType": "google_sheets_read",
  "config": {
    "credential_id": "cred_gsheets_prod_01",
    "spreadsheet_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    "sheet_name": "Scores",
    "has_header_row": true,
    "max_rows": 500
  }
}
```
