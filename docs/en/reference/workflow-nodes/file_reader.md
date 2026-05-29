---
title: File Reader
description: Reads a file from storage and outputs its contents.
---

# File Reader

## Overview

The File Reader node reads a file from a configured storage provider and emits its contents downstream. Use it when a workflow step depends on reading a stored artifact, uploaded input, or persisted battle result. Files may be returned as raw text or base64-encoded binary depending on the encoding setting. If the file is not found or access is denied, execution routes to the error output rather than halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `storage_provider` | enum (local, s3, supabase) | Yes | Storage backend to read from. Must match the provider where the file was written. |
| `file_path` | string | Yes | Path or key of the file within the storage provider. Supports template variables (e.g. {{run.artifact_path}}). |
| `encoding` | enum (utf8, base64) | No | Output encoding for file contents. Defaults to utf8. Use base64 for binary files such as images or PDFs. |
| `credential_id` | string | No | ID of the stored credential to use when authenticating with the storage provider. Required for S3 and private Supabase buckets. |
| `fail_on_missing` | boolean | No | When true, routes to the error output if the file does not exist. When false, emits an empty string and continues on the output port. Defaults to true. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger signal and optional runtime context. Any fields present are merged into template variable resolution for file_path. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on success. Contains file_content (string), file_path (string), byte_size (number), and encoding (string). |
| `error` | object | Emitted when the file cannot be read (not found, permission denied, provider unreachable). Contains error_code (string) and message (string). |

## Example

```json
{
  "nodeType": "file_reader",
  "config": {
    "storage_provider": "s3",
    "file_path": "battles/{{run.battle_id}}/submission.txt",
    "encoding": "utf8",
    "credential_id": "cred_s3_prod_01",
    "fail_on_missing": true
  }
}
```
