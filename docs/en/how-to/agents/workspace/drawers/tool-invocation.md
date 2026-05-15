---
title: Tool Invocation drawer
description: Forensic view of a single tool call — args, result, latency, and approval chain.
---

# Tool Invocation drawer

Opened from the [Tools Section](../tools) (Invocations tab) or from a [Run Detail drawer](./run-detail) tool-call row.

## Panels

| Panel | Contents |
|---|---|
| **Header** | Tool key, status, started/ended timestamps |
| **Args** | JSON arguments passed to the tool (secrets redacted) |
| **Result** | JSON result returned (secrets redacted) |
| **Latency** | Gateway round-trip ms |
| **Approval chain** | Who approved (if any), when, with what scope |
| **Source run id** | Back-link to the originating run |

## Redactions

Strings matching the platform's secret patterns (`sk-…`, bearer tokens, etc.) are replaced with `«redacted»` before render. The raw value is never sent to the browser.

## Errors

When `status = error`, the panel shows:

- `error.type` — e.g., `timeout`, `provider_5xx`, `schema_validation`
- `error.message` — human-readable
- `error.retry_after_ms` — if the gateway will retry


## Code-backed workflow

Source of truth: ToolInvocationDrawer.tsx.

1. Review payload, response, approval state, and approve or reject pending tool invocations.
2. Approval and rejection refresh invocation and approval queue queries.
3. Verify the related run unblocks or fails according to the decision.

## Related

- [Tools Section](../tools)
- [Run Detail drawer](./run-detail)
- [Tool Sandboxing](/en/explanation/agents/tool-sandboxing)
