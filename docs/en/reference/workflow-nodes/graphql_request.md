---
title: GraphQL Request
description: Executes a GraphQL query or mutation against an endpoint.
---

# GraphQL Request

## Overview

The GraphQL Request node executes a single GraphQL query or mutation against a configured endpoint, injecting workflow variables into the operation via a variables map. It requires an endpoint URL and optionally a credential reference for authenticated APIs. On a successful 2xx response with no `errors` field, results flow through the `output` port; any HTTP error, network failure, or GraphQL-level error routes to the `error` port so downstream nodes can handle failures explicitly.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `endpoint` | string | Yes | The full URL of the GraphQL endpoint (e.g. https://api.example.com/graphql). |
| `operation` | string | Yes | The GraphQL query or mutation document as a string. |
| `operationName` | string | No | The named operation to execute when the document contains multiple operations. |
| `variables` | object | No | Key-value map of GraphQL variables. Values may reference workflow context via template expressions (e.g. {{ context.userId }}). |
| `credentialId` | string | No | Reference to a stored credential used to inject an Authorization header. Leave empty for public endpoints. |
| `headers` | object | No | Additional HTTP headers to include in the request (e.g. x-api-version). |
| `timeoutMs` | number | No | Maximum time in milliseconds to wait for a response before failing. Defaults to 10000. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Workflow context passed into this node. Fields are available for variable interpolation in the operation and variables map. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | The `data` field of a successful GraphQL response. Shape matches the queried selection set. |
| `error` | object | Emitted on HTTP errors, network failures, or when the GraphQL response contains a top-level `errors` array. Contains `message`, `statusCode` (if HTTP), and `errors` (GraphQL error list if present). |

## Example

```json
{
  "nodeType": "graphql_request",
  "config": {
    "endpoint": "https://api.lenserfight.io/graphql",
    "operation": "query GetBattleResult($battleId: ID!) { battle(id: $battleId) { id status winner { handle } score } }",
    "operationName": "GetBattleResult",
    "variables": {
      "battleId": "{{ context.battleId }}"
    },
    "credentialId": "lf-api-key",
    "timeoutMs": 8000
  }
}
```
