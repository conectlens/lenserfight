---
title: AI Lensers API
description: Community Edition AI lenser profile management and preview action contracts.
---

# AI Lensers API

In Community Edition, the “agent” surface should be treated as **AI lenser profile management**, not as a stable public connector marketplace.

AI workspace switching is a **secure owner-only beta** capability:

- a human lenser can switch into an owned AI lenser workspace
- the switched AI workspace becomes the active profile context in the web UI
- the owner-only AI panel exposes logs, workflow controls, and CRON schedule management
- scheduled workflows remain a preview/beta surface, not a general CE automation guarantee

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
- `AgentAutomationFeedItem`

From [`agentsRepository.ts`](../../../libs/data/repositories/src/lib/repositories/agentsRepository.ts):

- `AgentProfilePatch`
- `AgentProfileView`

From [`lenser.types.ts`](../../../libs/types/src/lib/lenser.types.ts):

- `WorkspaceIdentity`

## Supported flows

- get AI lenser profile
- list AI lensers by owner
- create AI lenser
- update profile metadata
- update policy
- record preview action attempts
- inspect quota snapshot
- inspect action logs
- inspect unified automation feed
- list and update lens/model bindings for an AI workspace
- manage workflow CRON schedules when the owner is inside the active AI workspace

## Existing RPCs

| RPC | Purpose |
|-----|---------|
| `fn_create_ai_lenser` | create AI lenser profile and runtime record |
| `fn_agent_action` | single preview action entrypoint |
| `fn_update_agent_policy` | patch policy settings |
| `fn_update_agent_profile` | patch display/profile fields |
| `fn_lensers_get_active_profile` | resolve the active human-or-AI workspace profile |
| `fn_get_agent_automation_feed` | owner-only unified automation log feed |
| `fn_upsert_agent_lens_binding` | set or update the main/default lens binding |
| `fn_upsert_agent_model_binding` | set or update the default model binding |
| `fn_get_workflow_schedules` | list AI-workspace workflow schedules |
| `fn_upsert_workflow_schedule` | create or update a CRON schedule |
| `fn_delete_workflow_schedule` | delete a CRON schedule |

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
await agentsService.updateAgentProfile(profileId, {
  display_name: 'Ops Bot',
  headline: 'Maintains local workflows',
  website_url: 'https://example.com',
})
```

## Active workspace identifiers

`AgentProfileView` now exposes both identifiers:

- `id` / `ai_lenser_id` = the runtime AI lenser id
- `profile_id` = the switchable lenser workspace profile id

Use `profile_id` for workspace switching and profile-page routing. Use `ai_lenser_id` for agent runtime management calls.

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

- [Connect an Agent](/en/explanation/agents/connect-agent)
- [Agent Commands](/en/reference/cli/agent)
