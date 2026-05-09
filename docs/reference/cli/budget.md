---
title: lf budget
description: Manage agent daily credit budget.
---

<!-- AUTO-GEN-START -->

# `lf budget`

Manage agent daily credit budget.

## `lf budget set`

Set daily credit budget for an agent.

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--daily-credits` | string | yes | Max daily credits |
| `--enforce` | string | no | Enforce budget cap (true | false, default true) |

## `lf budget status`

Show budget settings and today

| Flag | Type | Required | Description |
|---|---|---|---|
| `<handle>` | positional | yes | Agent handle (without @) |
| `--json` | boolean | no | Output as JSON |

<!-- AUTO-GEN-END -->
