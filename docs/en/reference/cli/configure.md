---
title: lf configure
description: Configure local BYOK files, cloud BYOK, Ollama, and provider catalog.
---

# `lf configure`

Single hub for credentials and runtimes. Works in **local** or **cloud** API mode (`lf use local|cloud`).

## Local BYOK (encrypted file)

```bash
lf configure keys init
lf configure keys add
lf configure keys list
lf configure keys doctor
```

Backed by `@lenserfight/data/local-keys` at `~/.lenserfight/keys/` (passphrase in OS keychain).

## Cloud BYOK (Supabase vault)

```bash
lf configure byok list
lf configure byok setup
lf configure byok rotate <id>
```

Uses agent BYOK RPCs (`fn_byok_*`). Requires `lf auth login` in cloud mode.

## Ollama / local models

```bash
lf configure ollama
lf execute lens prompt --ollama --model llama3.2 "ping"
```

Set `OLLAMA_BASE_URL` or `LENSERFIGHT_OLLAMA_BASE_URL` in `.env.local` for local stacks.

## Providers catalog

```bash
lf configure providers list
lf configure providers config   # store vault key
```

## Environment

```bash
lf configure env
```

Shows resolved Supabase URL, mode, and key sources for the current directory.

## Dashboard

Press **`k`** on the main TUI (`lf`) to open the Configure sub-dashboard.
