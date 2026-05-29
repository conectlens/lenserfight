---
title: "lf runner — Deprecated Alias"
description: "'lf runner' is a deprecated alias for 'lf lenser'. Use lf lenser instead."
---

# `lf runner` — Deprecated

> **Deprecated.** `lf runner` is an alias that will be removed in a future release.
> Use [`lf lenser`](lenser.md) for all lenser management operations.

Running `lf runner <subcommand>` is functionally identical to `lf lenser <subcommand>`. A deprecation warning is printed to stderr on every invocation:

```
WARN  'runner' is deprecated. Use 'lenser' instead.
```

## Migration

Replace all uses of `lf runner` with `lf lenser`:

```bash
# Before
lf runner connect --name "My Agent" --type ollama --config '{"model":"llama3.2"}'
lf runner list
lf runner test <handle>

# After
lf lenser ai connect --name "My Agent" --type ollama --config '{"model":"llama3.2"}'
lf lenser ai list
lf lenser ai test <handle>
```

## Related

- [`lf lenser`](lenser.md) — canonical lenser management command
- [`lf agent`](agent.md) — the other deprecated alias (`agent` → `lenser`)
