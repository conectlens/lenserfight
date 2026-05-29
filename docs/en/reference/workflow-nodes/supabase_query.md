---
title: Supabase Query
description: Queries a Supabase table or calls an RPC function.
---

# Supabase Query

## Overview

The Supabase Query node calls a pre-approved Supabase RPC function and emits the result as structured data downstream. It does not accept arbitrary SQL — only RPC names present in the platform allowlist are permitted, so any unrecognised name produces an inline error in the output data rather than throwing. No separate credential configuration is required; the node relies on the server-side execution context which already holds the authenticated Supabase client. Use this node to read or write platform data (e.g. lenser memory, battle scores, leaderboards) without leaving the workflow graph.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `rpcName` | enum | Yes | Name of the Supabase RPC to call. Must be one of the platform allowlisted functions (e.g. fn_get_battle_scores, fn_xp_leaderboard, fn_upsert_lenser_memory). Unrecognised names resolve to an error envelope without aborting the run. |
| `params` | object | No | Key/value arguments forwarded verbatim to the RPC. Shape must match the RPC's parameter signature; validation is delegated to the database function. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | Upstream workflow data. Values from resolvedParams are available for template substitution inside the params object. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Execution envelope where data contains the RPC response. On success, data holds the RPC return value. On failure (disallowed RPC or missing name), data.error contains the reason and the node does not emit to the error port. |
| `error` | object | Emitted when the engine itself fails to dispatch the query (network error, Supabase service error). Contains data.error with the error message. |

## Example

<div v-pre>

```json
{
  "nodeType": "supabase_query",
  "config": {
    "rpcName": "fn_get_battle_scores",
    "params": {
      "battle_id": "{{resolvedParams.battleId}}"
    }
  }
}
```

</div>

