---
title: Common Contracts
description: Shared response, pagination, auth, and filtering conventions for LenserFight Community Edition.
---

# Common Contracts

Community Edition reuses a small set of shared response and query conventions across repositories, RPCs, and client hooks.

## Response envelope

The canonical envelope lives in [`libs/api/contracts/src/lib/envelope.ts`](../../../libs/api/contracts/src/lib/envelope.ts).

```ts
export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface ApiMeta {
  requestId?: string
  durationMs?: number
  limit?: number
  offset?: number
  total?: number
  hasNextPage?: boolean
  nextCursor?: string
}

export interface ApiResponseEnvelope<T> {
  data?: T
  meta?: ApiMeta
  error?: ApiError
}
```

### What to standardize on

- `data` for successful payloads
- `error` for machine-readable failures
- `meta` for pagination and request metadata

## Pagination

The canonical pagination shape is:

- `offset`
- `limit`
- `hasNextPage`

Some envelopes also carry `total`, but many repo-backed list RPCs do not return a reliable count yet. In those cases the repositories use the existing `rows.length >= limit` heuristic.

```ts
paginatedResponse(items, {
  offset,
  limit,
  hasNextPage: items.length === limit,
})
```

## Sorting and filtering

Community Edition prefers simple scalar query inputs over new bespoke filter DTOs.

Current repo patterns include:

- `sort`
- `search`
- `visibility`
- `offset`
- `limit`
- language hints such as `lang`

Examples already used in the repo:

- lenses: tag filter + `sort` + `offset` + `limit`
- workflows: `visibility`, `sort`, `search`, `offset`, `limit`
- threads: `lang`, `offset`, `limit`

## Auth modes

Use these labels consistently in docs:

| Mode | Meaning |
|------|---------|
| `anon` | Public read access without a user session |
| `authenticated` | Signed-in user session required |
| `owner-only` | Authenticated and restricted by RLS or ownership checks |
| `service-role/private` | Not part of the public Community Edition contract |

## DTO discipline

Use existing DTOs and interfaces from `libs/types` and `libs/api/contracts`.

Do not:

- invent new request query DTOs for docs-only examples
- rename fields away from the repo contract
- imply cursor-based pagination where the repo currently uses `offset` and `limit`

## Common public types

These are the main cross-cutting contracts to reuse in docs:

- `ApiResponseEnvelope<T>`
- `ApiMeta`
- `TriggerExecutionDTO`
- `NodeOutputEnvelope`
- `WorkflowSseEventEnvelope`

## Related

- [Lenses API](./lenses.md)
- [Workflows API](./workflows.md)
- [Threads API](./threads.md)
- [Providers and Execution](./providers-and-execution.md)
