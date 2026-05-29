---
title: Agent Execute
description: Runs an autonomous AI agent with a goal and a set of tools, returning its final answer and run trace.
---

# Agent Execute

## Overview

The `agent_execute` node launches an AI agent that autonomously selects and calls tools in a reasoning loop until it reaches a final answer or exhausts its step budget. You can point it at a saved AI Lenser definition via `agent_id`, or supply inline instructions directly in the configuration. The agent receives the node's `input` as its initial context and has access to whichever tools are granted in the `tools` list. Use this node when the task requires dynamic decision-making — e.g. researching an answer, executing a multi-step data retrieval, or judging battle outputs — rather than a fixed node sequence.

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `agent_id` | string | No | — | UUID of a saved AI Lenser to use as the agent definition (system prompt, tool defaults, model). Takes precedence over `instructions` when both are provided. |
| `instructions` | string | No | — | Inline system prompt / goal description for the agent. Used when no `agent_id` is given. Supports `{{variable}}` interpolation from `input`. |
| `tools` | array | No | `[]` | List of tool names the agent is permitted to call (e.g. `["web_search", "lens_execute", "sql_query"]`). Granting only the tools the task needs reduces cost and attack surface. |
| `model_key` | string | No | `"default"` | Model routing key. Use `"default"` to apply the workspace model policy, or a specific key such as `"claude-sonnet-4-6"` to override. |
| `max_steps` | number | No | `10` | Maximum number of reasoning steps (tool calls + completions) before the agent is forced to produce a final answer. Capped at `50`. |
| `on_max_steps` | string | No | `"return_partial"` | Behaviour when `max_steps` is reached without a final answer: `"return_partial"` emits whatever partial result exists; `"fail"` raises an error. |
:::

## Inputs

::: v-pre
| Port | Type | Description |
|---|---|---|
| `input` | object | Initial context injected into the agent's first user message and available for `{{variable}}` interpolation in `instructions`. |
:::

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | object | Contains `answer` (the agent's final text response), `steps_used` (number of steps taken), and `tool_calls` (array summarising each tool invocation). |
| `error` | object | Present on unrecoverable failure (model error, tool permission denied, or `on_max_steps: "fail"` triggered); contains `message` and `code`. |

## Example

```json
{
  "nodeType": "agent_execute",
  "config": {
    "agent_id": "b3c4d5e6-f7a8-9012-bcde-f34567890abc",
    "tools": ["web_search", "lens_execute"],
    "model_key": "default",
    "max_steps": 15,
    "on_max_steps": "return_partial"
  }
}
```

Inline instructions variant (no saved Lenser):

<div v-pre>

```json
{
  "nodeType": "agent_execute",
  "config": {
::: v-pre
    "instructions": "You are a battle judge. Evaluate both contenders in {{input.battle_context}} and declare a winner with a brief rationale.",
:::
    "tools": ["lens_execute"],
    "model_key": "claude-sonnet-4-6",
    "max_steps": 8,
    "on_max_steps": "return_partial"
  }
}
```

</div>

## Notes

- Every step consumed by the agent counts toward your workspace's AI usage quota. Keep `max_steps` as low as the task permits and prefer `agent_id` (which carries pre-tuned settings) over wide-open inline instructions.
- Tool access is deny-by-default: even if a tool is installed in your workspace, it must be listed in `tools` for this node to use it. This prevents accidental side effects in automated workflows.
- The `tool_calls` array in `output` is suitable for feeding into an audit log or a downstream `code` node that inspects what the agent did without re-running it.
- For deterministic, well-defined tasks (fixed steps, no branching decisions), a static node sequence is cheaper and more predictable than `agent_execute`. Reserve autonomous agents for tasks where the number or type of actions cannot be known in advance.
