---
title: Sub-Workflow
description: Invokes another saved workflow as a nested step.
---

# Sub-Workflow

## Overview

The Sub-Workflow node invokes another saved workflow as a nested step within the current workflow, passing input data in and receiving its output as a structured result. Use it to decompose complex orchestration into reusable building blocks or to share common logic (e.g. a scoring pipeline, a media pre-processing chain) across multiple parent workflows. The referenced workflow runs synchronously by default; if it fails, execution is routed to the error port. Input and output schemas are derived from the target workflow's own Start and End nodes, so callers must match those shapes.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `workflowId` | string | Yes | ID of the saved workflow to invoke. Must be a workflow owned by or shared with the current user. |
| `inputMapping` | object | No | Key-value map that renames or selects fields from the incoming data before passing them to the sub-workflow's Start node. Omit to forward the full input as-is. |
| `outputMapping` | object | No | Key-value map that renames or selects fields from the sub-workflow's output before emitting on the output port. Omit to forward the full result. |
| `timeoutMs` | number | No | Maximum milliseconds to wait for the sub-workflow to complete. Defaults to the platform limit (30 000 ms). Exceeded runs are routed to the error port. |
| `versionPin` | enum | No | Which version of the target workflow to run: 'latest' (default) always uses the most recently published version; 'stable' uses the last version tagged stable; a specific semver string pins an exact published version. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Arbitrary data passed to the sub-workflow's Start node. Shape must match the target workflow's expected input schema. |
| `context` | object | Optional execution context (e.g. battle ID, round number, user metadata) forwarded alongside the primary input for logging and tracing inside the sub-workflow. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Data emitted by the sub-workflow's End node on successful completion, after any outputMapping is applied. |
| `error` | object | Emitted when the sub-workflow fails, times out, or is not found. Contains 'code', 'message', and 'workflowId' fields for downstream error handling. |

## Example

```json
{
  "nodeType": "sub_workflow",
  "config": {
    "workflowId": "wf_score_and_rank_v2",
    "versionPin": "stable",
    "inputMapping": {
      "prompt": "userPrompt",
      "modelOutput": "contenderResponse"
    },
    "timeoutMs": 15000
  }
}
```
