---
title: SQL Query
description: Executes a SQL query against a configured database connection.
---

# SQL Query

## Overview

The SQL Query node executes a parameterized SQL statement against a configured database connection and emits the result rows downstream. Use it to fetch, insert, update, or delete data from a relational database as part of a battle or automation workflow. Query parameters are bound from the node's input data, preventing SQL injection. If the query fails or the connection is unavailable, execution is routed to the error output port rather than halting the workflow.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `connectionId` | string | Yes | ID of the saved database credential/connection to use. Credentials are managed in the project settings and never stored in the node config. |
| `query` | string | Yes | The SQL statement to execute. Use named placeholders (e.g. :userId, :score) that are bound from the input data at runtime. |
| `dialect` | enum | Yes | SQL dialect of the target database. One of: postgres, mysql, sqlite, mssql. Controls query parsing and escaping behavior. |
| `timeoutMs` | number | No | Maximum milliseconds to wait for the query to complete before treating it as a failure. Defaults to 10000. |
| `returnRows` | boolean | No | When true, the output data includes the full result set as a rows array. When false, only rowCount and metadata are emitted. Defaults to true. |
| `singleRow` | boolean | No | When true, expects exactly one row and emits it as a flat object rather than an array. Routes to the error port if zero or more than one row is returned. Defaults to false. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Trigger input. Any fields on this object are available as named bind parameters in the query (e.g. input.userId binds to :userId). |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Emitted on successful query execution. Contains rows (array of result objects), rowCount (number), and the original input passed through. |
| `error` | object | Emitted when the query fails, times out, or singleRow mode receives an unexpected row count. Contains message, code, and the original input. |

## Example

```json
{
  "nodeType": "sql_query",
  "config": {
    "connectionId": "conn_pg_battles_prod",
    "dialect": "postgres",
    "query": "SELECT id, score, voted_at FROM battle_votes WHERE battle_id = :battleId AND voter_id = :voterId LIMIT 1",
    "singleRow": true,
    "timeoutMs": 5000
  }
}
```
