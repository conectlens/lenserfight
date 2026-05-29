---
title: Delegate
description: Delegates execution to another workflow or sub-agent.
---

# Delegate

## Overview

The Delegate node hands off execution to another workflow or a named sub-agent, passing the current payload through and resuming once the delegated target completes. Use it to decompose complex workflows into reusable units, fan out to specialized sub-workflows, or invoke an AI agent with a specific role. The delegated target runs in its own execution context; errors propagate back through the `error` output port so the parent workflow can handle failures without crashing the entire run. Credentials and environment bindings are inherited from the parent unless overridden in the node config.

## Configuration

| Field | Type | Required | Description |
|---|---|---|---|
| `targetType` | enum | Yes | Whether to delegate to another workflow or a sub-agent. Accepted values: "workflow" | "agent". |
| `targetId` | string | Yes | The ID of the target workflow or agent to delegate to. Must exist and be accessible to the current workspace. |
| `inputMapping` | object | No | Key-value map of parent payload fields to target input fields. Omit to pass the entire input payload unchanged. |
| `timeoutMs` | number | No | Maximum time in milliseconds to wait for the delegated target to complete before emitting to the `error` port. Defaults to the workspace-level execution timeout. |
| `waitForCompletion` | boolean | No | When true (default), the parent workflow pauses until the delegated target finishes. When false, execution continues immediately and the result is ignored. |

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | any | The payload forwarded to the delegated workflow or agent. Shape is passed through unless overridden by inputMapping. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | any | The result returned by the delegated workflow or agent upon successful completion. |
| `error` | object | Emitted when the delegated target fails, times out, or is not found. Contains `code`, `message`, and `targetId`. |

## Example

```json
{
  "nodeType": "delegate",
  "config": {
    "targetType": "workflow",
    "targetId": "wf_judge_text_battle_v2",
    "inputMapping": {
      "contenderAOutput": "submissionA",
      "contenderBOutput": "submissionB",
      "battleId": "battleId"
    },
    "timeoutMs": 30000
  }
}
```
