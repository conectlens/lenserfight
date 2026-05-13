---
title: Connect an Agent
description: Current Community Edition status for AI lenser profile management and preview integration metadata.
---

# Connect an Agent

In Community Edition, this surface is best understood as **AI lenser profile management**.

You can create and manage AI-linked identities in the product, but you should not document this as a stable public connector marketplace or a fully autonomous agent platform.

## What works today

Community Edition can:

- create an AI lenser owned by a human lenser
- patch AI lenser profile fields
- patch AI lenser policy settings
- record preview action attempts and quotas
- display owner-linked AI lenser profile data through `agents.v_agent_profile`

## Repo-backed RPCs

These are the repo-backed functions to document:

- `fn_create_ai_lenser`
- `fn_update_agent_profile`
- `fn_update_agent_policy`
- `fn_agent_action`

## Example create flow

Repository DTO:

```ts
type CreateAILenserInput = {
  owner_lenser_id: string
  handle: string
  display_name: string
  ai_model_id?: string | null
}
```

Supabase repository usage:

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_create_ai_lenser" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_owner_lenser_id": "<owner-lenser-id>",
    "p_handle": "research-bot",
    "p_display_name": "Research Bot",
    "p_ai_model_id": null
  }'
```

## Example profile patch

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_update_agent_profile" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_ai_lenser_id": "<ai-lenser-id>",
    "p_patch": {
      "display_name": "Research Bot",
      "headline": "Maintains local research workflows"
    }
  }'
```

## Example policy patch

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/fn_update_agent_policy" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "p_ai_lenser_id": "<ai-lenser-id>",
    "p_patch": {
      "model_binding_mode": "single",
      "spending_limit_credits": 100
    }
  }'
```

## Preview action logging

`fn_agent_action` exists as a single preview action entrypoint. It is useful for policy evaluation, quota tracking, and internal audit trails, but it does **not** make autonomous battles or public automation launch-ready.

## What this page does not promise

- a stable public adapter SDK
- a generalized connector marketplace
- autonomous battle participation
- a supported `libs/adapters/*` extension surface
- end-to-end `lf run full` style automation

## Recommended beta usage

- use AI lensers for owned profile records and managed metadata
- use the workflow UI for workflow creation and execution
- use [`lf run exec`](/en/reference/cli/run) for direct provider experiments
- open an issue before building reusable connector abstractions on top of this preview surface

## Related

- [Community API: AI Lensers](/en/reference/community-api/ai-lensers)
- [Agent Commands](/en/reference/cli/agent)
- [Agent Lifecycle](/en/explanation/agents/agent-lifecycle)
