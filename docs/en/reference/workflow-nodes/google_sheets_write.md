---
title: Google Sheets Write
description: Writes or appends rows to a Google Sheets spreadsheet.
---

# Google Sheets Write

## Overview

The Google Sheets Write node writes or appends row data to a specified Google Sheets spreadsheet using OAuth2 credentials. It accepts tabular data (an array of row objects or arrays) and maps values into the target sheet range. Requires a configured Google OAuth2 credential with Sheets API scope. On success it emits the updated range metadata; on failure it routes to the error port with the API error detail.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored Google OAuth2 credential with Sheets API (spreadsheets) scope. |
| `spreadsheetId` | string | Yes | The Google Sheets spreadsheet ID, found in the sheet URL between /d/ and /edit. |
| `sheetName` | string | Yes | Name of the target sheet tab (e.g. 'Sheet1'). Case-sensitive. |
| `range` | string | No | A1 notation range to start writing from (e.g. 'A1', 'B3'). Defaults to 'A1'. For append mode this is ignored and rows are added after the last populated row. |
| `writeMode` | enum | Yes | Controls write behavior. 'overwrite' replaces values starting at the given range; 'append' adds rows after the last populated row. |
| `valueInputOption` | enum | No | How input values are interpreted: 'RAW' stores values as-is; 'USER_ENTERED' allows formula strings and auto-formatting. Defaults to 'RAW'. |
| `includeHeaders` | boolean | No | When true, the first row of the input data is treated as column headers and written as the first row. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | array<object> | array<array> | Tabular data to write. Each element represents one row — either a flat object (keys become column values in order) or an array of cell values. A single object is also accepted and treated as one row. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Metadata returned by the Sheets API after a successful write, including updatedRange, updatedRows, updatedColumns, and updatedCells. |
| `error` | object | Emitted when the write fails (e.g. invalid credentials, missing permissions, bad range, API quota exceeded). Contains message, code, and the original input data for retry or fallback routing. |

## Example

```json
{
  "nodeType": "google_sheets_write",
  "config": {
    "credentialId": "cred_goog_oauth_abc123",
    "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    "sheetName": "BattleResults",
    "writeMode": "append",
    "valueInputOption": "USER_ENTERED"
  }
}
```
