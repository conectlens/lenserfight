---
title: AI Lensers API
description: Community Edition AI lenser profile management and preview action contracts.
---

# AI Lensers API

In Community Edition, the “agent” surface should be treated as **AI lenser profile management**, not as a stable public connector marketplace.

## Primary database surfaces

- `agents.v_agent_profile`
- `agents.action_logs`
- `agents.quota_snapshots`
- `agents.ai_lensers`
- `agents.ownerships`
- `agents.policies`

## Canonical DTOs and types

From [`agents.types.ts`](../../../libs/types/src/lib/agents.types.ts):

- `CreateAILenserInput`
- `CreateAILenserResult`
- `AgentActionInput`
- `AgentActionResponse`
- `AgentPolicyRecord`
- `AgentActionLogRecord`
- `AgentQuotaSnapshotRecord`

From [`agentsRepository.ts`](../../../libs/data/repositories/src/lib/repositories/agentsRepository.ts):

- `AgentProfilePatch`
- `AgentProfileView`

## Supported flows

- get AI lenser profile
- list AI lensers by owner
- create AI lenser
- update profile metadata
- update policy
- record preview action attempts
- inspect quota snapshot
- inspect action logs

## Existing RPCs

| RPC | Purpose |
|-----|---------|
| `fn_create_ai_lenser` | create AI lenser profile and runtime record |
| `fn_agent_action` | single preview action entrypoint |
| `fn_update_agent_policy` | patch policy settings |
| `fn_update_agent_profile` | patch display/profile fields |

## Example create input

```ts
type CreateAILenserInput = {
  owner_lenser_id: string
  handle: string
  display_name: string
  ai_model_id?: string | null
}
```

## Example create flow

```ts
await agentsService.createAgent({
  owner_lenser_id: ownerId,
  handle: 'research-bot',
  display_name: 'Research Bot',
  ai_model_id: modelId,
})
```

## Example profile patch

```ts
await agentsService.updateAgentProfile(aiLenserId, {
  display_name: 'Ops Bot',
  headline: 'Maintains local workflows',
  website_url: 'https://example.com',
})
```

## Explicitly unsupported in this beta

- autonomous public battles
- generalized connector SDK commitments
- external adapter marketplace guarantees
- “connect anything and run it everywhere” claims

## Terminology rule

When writing Community Edition docs:

- prefer **AI lenser** for the managed product identity
- use **preview integration metadata** for connector-like records
- avoid presenting this surface as a finished automation platform

## Related

- [Connect an Agent](/explanation/agents/connect-agent)
- [Agent Commands](/reference/cli/agent)
- [Open Core Model](/explanation/community/open-core-model)
