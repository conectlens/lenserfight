---
title: Object Storage Upload
description: Uploads a file to object storage (S3-compatible).
---

# Object Storage Upload

## Overview

The Object Storage Upload node uploads a file or binary payload to an S3-compatible object storage bucket and emits the resulting object URL and metadata on success. Configure it with a storage credential reference, target bucket, and destination key (path); the key supports template variables for dynamic naming. On upload failure the node routes to the `error` output, carrying the provider error message, so downstream nodes can handle retries or fallback logic without stopping the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored S3-compatible credential (access key + secret + endpoint). Resolved at runtime from the workflow's credential store. |
| `bucket` | string | Yes | Target bucket name. Must already exist; the node does not create buckets. |
| `key` | string | Yes | Destination object key (path within the bucket). Supports template variables, e.g. `results/{{runId}}/output.json`. |
| `contentType` | string | No | MIME type set on the uploaded object (e.g. `application/json`, `image/png`). Defaults to `application/octet-stream` when omitted. |
| `acl` | enum | No | Canned ACL applied to the object. One of: `private` (default), `public-read`, `authenticated-read`. |
| `overwrite` | boolean | No | When false, the upload fails if an object already exists at the target key. Defaults to true. |
| `region` | string | No | AWS region or equivalent for the storage endpoint (e.g. `us-east-1`). Required for AWS S3; optional for self-hosted providers. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `file` | Buffer | string | The file content to upload. Accepts a raw binary Buffer or a base64-encoded string. When a string is provided the node decodes it before upload. |
| `key` | string | Optional runtime override for the destination object key. Takes precedence over the static `key` config field when present. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | { url: string; bucket: string; key: string; size: number; etag: string } | Emitted on successful upload. `url` is the public or presigned URL of the uploaded object depending on the configured ACL. |
| `error` | { message: string; code: string; statusCode: number } | Emitted when the upload fails (network error, auth failure, key conflict when overwrite is false, etc.). The workflow continues from this port rather than halting. |

## Example

```json
{
  "nodeType": "object_storage_upload",
  "config": {
    "credentialId": "cred_s3_battle_artifacts",
    "bucket": "lenserfight-battle-results",
    "key": "battles/{{battleId}}/{{runId}}/result.json",
    "contentType": "application/json",
    "acl": "private",
    "overwrite": false
  }
}
```
