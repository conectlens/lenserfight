---
title: Local Models
description: Run LenserFight against a local Ollama instance from the CLI or the web app.
---

# Local Models

Use this path when you want an OSS-only setup with no cloud model dependency.

## Prerequisites

- Ollama installed and running
- a pulled model such as `llama3.2`
- LenserFight workspace configured with `lf setup`

## Environment

If Ollama is not running on the default host, set one or both of these:

```bash
export LENSERFIGHT_OLLAMA_BASE_URL=http://127.0.0.1:11434
export VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434
```

`LENSERFIGHT_OLLAMA_BASE_URL` is used by the CLI and server-side tools.
`VITE_OLLAMA_BASE_URL` is used by browser builds.

## CLI execution

```bash
lf run exec --ollama --model llama3.2 --prompt "Explain workflow DAGs simply"
```

## Register a runner record

```bash
lf runner connect \
  --name "Local Ollama" \
  --type ollama \
  --config '{"model":"llama3.2","baseUrl":"http://localhost:11434"}'
```

## Web app execution

When the active provider is Ollama, the browser checks `${VITE_OLLAMA_BASE_URL}/api/version` and `${VITE_OLLAMA_BASE_URL}/api/tags`.

If the browser cannot connect:

- make sure `ollama serve` is running
- make sure the configured base URL matches the reachable host
- enable permissive local CORS if your browser and Ollama host differ

## Verify

```bash
lf doctor --check ollama
```
