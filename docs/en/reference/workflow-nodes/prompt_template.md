---
title: Prompt Template
description: Renders a parameterised prompt string by interpolating upstream variables into a template.
---

# Prompt Template

## Overview

::: v-pre
The `prompt_template` node takes a string template with `{{variable}}` placeholders and produces a fully rendered string by substituting values from upstream workflow data or static defaults. It is most commonly placed immediately before a `lens_execute` or `code` node to construct the exact text sent to a model. The interpolation engine supports simple variable substitution and dot-path access (e.g. `{{user.name}}`); it does not execute logic — use `code` for conditional rendering.
:::

## Configuration

::: v-pre
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `template` | string | Yes | — | The template string. Wrap variable names in double curly braces: `{{variable_name}}`. Supports dot-path notation: `{{result.score}}`. |
| `variables` | object | No | `{}` | Static default values for template variables. These are overridden by any matching key in the `input` port's data. |
| `strict` | boolean | No | `false` | When `true`, the node fails if any placeholder has no resolved value (neither from input nor from `variables`). When `false`, unresolved placeholders are replaced with an empty string. |
| `trim_output` | boolean | No | `true` | Strip leading and trailing whitespace from the rendered string before emitting. |
:::

## Inputs

| Port | Type | Description |
|---|---|---|
| `input` | object | Key-value pairs that override or supplement `variables` during rendering. Nested objects are accessible via dot notation in the template. |

## Outputs

| Port | Type | Description |
|---|---|---|
| `output` | string | The fully rendered template string. |
| `error` | object | Present only when `strict` is `true` and one or more placeholders could not be resolved; contains `message` and the list of unresolved keys in `missing_keys`. |

## Example

<div v-pre>

```json
{
  "nodeType": "prompt_template",
  "config": {
::: v-pre
    "template": "You are a {{role}} assistant. Summarise the following in {{language}}:\n\n{{content}}",
:::
    "variables": {
      "role": "helpful",
      "language": "English"
    },
    "strict": true,
    "trim_output": true
  }
}
```

</div>

Given `input = { "content": "The battle ended in a draw.", "language": "Turkish" }`, the rendered output would be:

```
You are a helpful assistant. Summarise the following in Turkish:

The battle ended in a draw.
```

## Notes

- Template variables are resolved by merging `variables` (lower priority) with the `input` object (higher priority), so upstream data always wins over static defaults.
::: v-pre
- Dot-path access works for any depth: `{{a.b.c}}` resolves the nested key `c` inside `b` inside `a`. Array indexing (`{{items.0}}`) is also supported.
:::
- For templates longer than a few hundred characters, consider storing the template text in a workflow variable or `kv_store` node and reading it in dynamically — this makes it easier to update without editing the workflow graph.
- This node does not call any AI model; it is purely string interpolation and adds negligible latency.
