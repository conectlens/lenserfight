---
title: Rename Field
description: Renames a field in an object.
---

# Rename Field

## Overview

The Rename Field node renames a single key within an incoming object, emitting the transformed object with the new key name and the original value intact. Use it to normalize field names between workflow stages — for example, mapping an upstream API's `user_id` to a downstream node's expected `userId`. If the specified source field does not exist on the input object, the node routes execution to its `error` output rather than silently passing through an unchanged object.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | Yes | The existing key to rename. Supports dot-notation for nested fields (e.g. `meta.userId`). |
| `to` | string | Yes | The new key name to assign to the value. Must be a valid identifier; dot-notation creates nested output keys. |
| `remove_original` | boolean | No | When true (default), the original key is deleted after the rename. Set to false to keep both keys. |
| `error_on_missing` | boolean | No | When true (default), routes to the error output if the source field is absent. When false, passes the object through unchanged. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | The object whose field will be renamed. Must be a JSON object; arrays and primitives are rejected. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The transformed object with the field renamed. All other keys are passed through unchanged. |
| `error` | object | Emitted when the source field is missing and `error_on_missing` is true. Carries the original object plus an `error` property describing the failure. |

## Example

```json
{
  "nodeType": "rename_field",
  "config": {
    "from": "user_id",
    "to": "userId",
    "remove_original": true,
    "error_on_missing": true
  }
}
```
