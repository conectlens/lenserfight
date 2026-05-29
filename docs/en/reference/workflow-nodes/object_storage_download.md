---
title: Object Storage Download
description: Downloads a file from object storage (S3-compatible).
---

# Object Storage Download

## Overview

The Object Storage Download node retrieves a file from an S3-compatible object storage bucket and makes its contents available as a workflow value. It requires a configured storage credential and a bucket/key pair to locate the object. If the object does not exist or the credential lacks permission, execution routes to the error output rather than failing the entire workflow. Use this node to load prompt templates, reference datasets, media assets, or any file-backed input before passing it to downstream nodes such as AI model or transformation nodes.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `credentialId` | string | Yes | ID of the stored S3-compatible credential (access key + secret) to authenticate with the storage provider. |
| `endpoint` | string | No | Custom S3-compatible endpoint URL (e.g. https://s3.eu-central-1.amazonaws.com or a MinIO host). Leave blank to use the AWS default regional endpoint. |
| `bucket` | string | Yes | Name of the bucket that contains the object. |
| `key` | string | Yes | Full object key (path) within the bucket, e.g. datasets/prompts/v3.json. Supports workflow variable interpolation. |
| `region` | string | No | AWS region or equivalent. Required for AWS S3; optional for providers that infer region from the endpoint. |
| `encoding` | enum | No | How to decode the downloaded bytes before passing to outputs. Options: utf8 (default), base64, binary. Use base64 for binary assets that will be forwarded to a media node. |
| `timeoutMs` | number | No | Maximum milliseconds to wait for the download to complete. Defaults to 30000. Exceeding this limit routes to the error output. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Trigger signal that initiates the download. Carries workflow context; any upstream value is passed through unchanged to the output port on success. |
| `key` | string | Optional dynamic override for the object key. When connected, this value takes precedence over the static key field in config, allowing the key to be computed at runtime by an upstream node. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | string | Buffer | The decoded file contents. Type is string when encoding is utf8, Buffer otherwise. Upstream context is merged with a fileContent property containing the downloaded data. |
| `error` | object | Emitted when the download fails — object not found, permission denied, network timeout, or credential error. Carries message, code, and bucket/key for downstream error-handling or retry nodes. |

## Example

```json
{
  "nodeType": "object_storage_download",
  "config": {
    "credentialId": "cred_s3_prod_east",
    "bucket": "lenserfight-battle-assets",
    "key": "templates/judge-prompt-v2.txt",
    "encoding": "utf8"
  }
}
```
