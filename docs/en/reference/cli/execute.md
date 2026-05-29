---
title: lf execute
description: Unified hub for workflow, battle, lens, and team AI executions.
---

# `lf execute`

Professional entry point for running and observing AI work on LenserFight. Commands delegate to existing RPC paths (`callRpc` / `callRest`) — no duplicate data layer in the CLI.

## Workflow runs

```bash
lf execute status
lf execute workflow list
lf execute workflow inspect <RUN-UUID>
lf execute workflow wait <RUN-UUID>
lf execute workflow stream <RUN-UUID>    # SSE-style event tail
lf execute workflow cancel <RUN-UUID>
```

`lf execution …` remains available; prefer `lf execute workflow …` for new scripts.

### Streaming events

```bash
lf execute workflow stream <RUN-UUID> --timeout 600
# or legacy:
lf execution events <RUN-UUID> --follow
```

Polls `lenses.workflow_run_events` and prints token chunks with terminal FX while you wait.

## Battles

```bash
lf execute battle exec <battle-id> …
lf execute battle dispatch <battle-id> …
lf execute battle file-run <slug>
lf execute battle jobs <battle-id>
```

## Lens / prompt

```bash
lf execute lens prompt --provider openai --model gpt-4o "Hello"
lf execute prompt …    # alias
```

Uses `@lenserfight/providers` for BYOK (env), Ollama, or cloud RPC.

## Team runs

```bash
lf execute team dispatch …
lf execute team list
```

## Dashboard

From `lf` (TUI): press **`e`** for the Execute sub-dashboard, **`k`** for Configure (BYOK / Ollama / providers).

See also [lf configure](./configure.md) and [CLI dashboard](/en/how-to/operations/cli-dashboard.md).
