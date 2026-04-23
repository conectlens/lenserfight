---
title: Providers and Execution
description: Community Edition provider paths, execution modes, and workflow runtime limitations.
---

# Providers and Execution

Community Edition supports a narrow, explicit set of execution paths. The docs should describe those paths plainly instead of implying a general execution fabric.

## Supported execution modes

- local Ollama execution
- local BYOK execution
- platform-credit execution where already wired
- browser-side workflow execution for supported providers only

## Canonical DTO

From [`execution.types.ts`](../../../libs/types/src/lib/execution.types.ts):

```ts
type TriggerExecutionDTO = {
  lens_id?: string
  version_id?: string
  model_id: string
  input_snapshot: Record<string, unknown>
  resource_bindings?: { resource_id: string; binding_key: string }[]
  attachment_bindings?: { media_object_id: string; binding_key: string }[]
  funding_source: 'user_byok_cloud' | 'user_byok_local' | 'platform_credit' | 'sponsored'
  origin_type: 'battle' | 'content_preview' | 'lens_preview' | 'template_test' | 'forum' | 'api' | 'cli'
  byok_key_ref_id?: string
}
```

## Provider matrix

The workflow browser executor currently distinguishes:

- text providers: `openai`, `anthropic`, `google`, `mistral`, `ollama`
- local media provider path: `fal-ai`

Source: [`useWorkflowExecution.ts`](../../../libs/features/workflows/src/lib/hooks/useWorkflowExecution.ts)

## BYOK split

### `user_byok_local`

- key resolved locally
- browser-side execution supported where the provider path exists
- best fit for local developer workflows

### `user_byok_cloud`

- key reference stored remotely
- workflow execution depends on the platform executor
- not a self-host guarantee for Community Edition

### `platform_credit`

- execution uses configured provider credentials
- wallet/execution clients route through the limited `/execute/*` HTTP surface

## Execution HTTP endpoints

Community Edition docs should treat these as the only currently documented execution endpoints:

- `POST /execute/wallet`
- `POST /execute/byok`
- `POST /execute/image`
- `POST /execute/stream`

See [Execution Platform Overview](/reference/platform-api/api-overview).

## CLI alignment

The only launch-ready CLI execution path is:

- [`lf run exec`](/reference/cli/run)

Use it for:

- local Ollama experiments
- BYOK model tests
- direct prompt execution outside the workflow UI

## Workflow runtime caveats

- browser-side execution rejects unsupported providers
- cloud BYOK workflow runs are queued for the platform executor instead of executed fully in-browser
- run progress uses database persistence plus best-effort event replay
- SSE streaming and recovery are still under active hardening

## Related

- [Run Commands](/reference/cli/run)
- [Workflows API](./workflows.md)
- [Workflow Execution Engine](/reference/workflows/execution-engine)
