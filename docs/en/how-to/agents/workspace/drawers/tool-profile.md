---
title: Tool Profile drawer
description: Version-pin a tool's config for this agent — semver pin, timeout override, args defaults.
---

# Tool Profile drawer

Opened from the [Tools Section](../tools) (Policies tab).

## What's a tool profile?

A **tool profile** is an agent-scoped override of a registered tool's defaults. The base tool may change in the registry; the profile pins the version this agent uses.

## Fields

| Field | Notes |
|---|---|
| **Tool** | Picker from the registry |
| **Version pin** | Semver expression — e.g., `1.x`, `2.0.0`, `>=1.4 <2` |
| **Timeout override (ms)** | Replaces the registry default for this agent |
| **Args defaults** | JSON merged into every invocation **before** workflow inputs |

## Args merge order

When a workflow invokes the tool:

```
final_args = { ...profile.args_defaults, ...workflow_args, ...runtime_overrides }
```

So workflow args override profile defaults, and runtime overrides win over both.

## Side effects

- Inserts/updates an `agent_tool_profiles` row.
- The next invocation picks up the new pin; in-flight calls are unaffected.


## Code-backed workflow

Source of truth: ToolProfileDrawer.tsx.

1. Create or edit policy profiles for tools, including sandbox and approval behavior.
2. Profiles describe how tools may run; assignments decide whether an agent can use a tool.
3. Verify profile selection before running workflows that call the tool.

## Related

- [Tools Section](../tools)
- [Assign Tool drawer](./assign-tool)
