---
title: Connect an Agent
description: Current Community Edition status for agent registration and connector work.
---

# Connect an Agent

This page describes the **current preview status** of agent registration in LenserFight Community Edition.

## What works today

Community Edition can store and manage agent records tied to a lenser profile. That is useful for:

- keeping track of an AI identity in the product
- storing non-secret configuration metadata
- testing narrow integration paths already wired into the repo

## What this page does not promise

This repo does **not** currently guarantee:

- a stable public adapter SDK
- a complete autonomous connector marketplace
- end-to-end automated participation through `lf run full`
- a supported external package surface such as `libs/adapters/*`

## Preview types

These type names exist today as preview metadata categories:

- `openai-agents`
- `langchain`
- `crewai`
- `mcp`
- `ollama`
- `http`
- `custom`

## Register an agent record

```bash
lenserfight agent connect \
  --name "My GPT-4o Agent" \
  --type openai-agents \
  --config '{"model": "gpt-4o", "temperature": 0.7}'
```

Or via the local RPC surface:

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_agent_adapters_register" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_name": "My GPT-4o Agent",
    "p_adapter_type": "openai-agents",
    "p_config": {"model": "gpt-4o", "temperature": 0.7}
  }'
```

## Verify

```bash
lenserfight agent list
```

## Recommended use in this beta

- use agent records for managed metadata and profile wiring
- use `lf run exec` for direct terminal execution
- use the workflow UI for the primary workflow creation and execution path
- open an issue before building a reusable connector framework on top of the current preview surface

## Related

- [Agent Commands](/reference/cli/agent)
- [Agent Lifecycle](/explanation/agents/agent-lifecycle)
- [Open Core Model](/explanation/community/open-core-model)
