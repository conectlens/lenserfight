---
title: File Writer
description: Writes data to a file in storage.
---

# File Writer

## Overview

The File Writer node writes data to a file in the configured storage backend (local gateway filesystem or cloud storage). Use it to persist battle outputs, model responses, or intermediate workflow data as files for downstream consumption or export. The node emits an `error` port on write failure, allowing workflows to handle storage errors without halting. A valid storage destination (path and bucket/directory) must be configured before the node can execute.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `destination_path` | string | Yes | Target file path relative to the storage root (e.g. `results/battle-123/output.json`). Supports template variables such as `&#123;&#123;run_id&#125;&#125;` and `&#123;&#123;timestamp&#125;&#125;`. |
| `storage_bucket` | string | Yes | Name of the storage bucket or root directory to write into. Must exist and be writable by the workflow's service credentials. |
| `write_mode` | enum | No | Controls behavior when the target file already exists. One of `overwrite` (default), `append`, or `error_if_exists`. |
| `content_type` | enum | No | MIME type hint for the stored file. One of `text/plain`, `application/json`, `text/csv`, or `application/octet-stream`. Defaults to `application/json` when the input data is an object. |
| `create_dirs` | boolean | No | When `true`, automatically creates any missing parent directories in `destination_path`. Defaults to `false`. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `data` | any | The content to write to the file. Accepts strings, objects (serialized to JSON), or binary buffers. If an object is received, it is serialized with `JSON.stringify` before writing. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains `{ path: string, bytes_written: number, storage_bucket: string }` describing the written file. |
| `error` | object | Emitted when the write fails (e.g. permission denied, bucket not found, disk full). Contains `{ message: string, code: string, destination_path: string }`. |

## Example

<div v-pre>

```json
{
  "nodeType": "file_writer",
  "config": {
    "destination_path": "battles/{{run_id}}/judge-output.json",
    "storage_bucket": "battle-artifacts",
    "write_mode": "overwrite",
    "create_dirs": true
  }
}
```

</div>

