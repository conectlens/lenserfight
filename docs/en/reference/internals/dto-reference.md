---
title: DTO Reference
description: Request and response DTO shapes for ConnectedLenses, anchored in the @lenserfight/types package. Covers identity, lens, workflow, agent, schedule, and approval payloads with the standard envelope fields.
---

# DTO Reference

Every payload that crosses an API boundary lives in [libs/types/src/lib/](../../libs/types/src/lib/). This page summarizes the contract types and lists the canonical request/response names for each operation. UI, CLI, and external integrations consume the same package — there is no second source of truth.

## Standard envelope fields

Most write DTOs include a subset of:

| Field | Purpose |
|-------|---------|
| `id` | Server-assigned UUID (response only). |
| `actor_lenser_id` | Who initiated the action. Resolved from session in most RPCs. |
| `target_*_id` | What the action operates on. |
| `status` | Lifecycle state. |
| `version` | Optimistic-concurrency token where applicable. |
| `created_at`, `updated_at` | ISO-8601 timestamps. |
| `validation_errors` | `Array<{ field, code, message }>` returned on 4xx without raising. |
| `correlation_id` | Trace correlation for log/event streams. |
| `idempotency_key` | Caller-supplied; engine refuses duplicate writes within a window. |

These are conventions, not a single base interface. Most existing DTOs do not yet expose `correlation_id` or `idempotency_key`; those are tagged in [Future work](#future-work) below.

## Identity DTOs

### Lenser

[libs/types/src/lib/lenser.types.ts](../../libs/types/src/lib/lenser.types.ts)

| DTO | Use |
|-----|-----|
| [`Lenser`](../../libs/types/src/lib/lenser.types.ts#L63) | Polymorphic profile (`type ∈ {human, ai}`) |
| [`LenserCompactProfile`](../../libs/types/src/lib/lenser.types.ts#L8) | List item shape |
| [`AuthorProfile`](../../libs/types/src/lib/lenser.types.ts#L1) | Denormalized author for content rows |
| [`WorkspaceIdentity`](../../libs/types/src/lib/lenser.types.ts#L16) | Active workspace context |
| [`CreateLenserDTO`](../../libs/types/src/lib/lenser.types.ts#L150) | Identity creation |
| [`LenserProfileDTO`](../../libs/types/src/lib/lenser.types.ts#L251) | Public-facing profile shape |
| [`ProfileAccessPayload`](../../libs/types/src/lib/lenser.types.ts#L222) | `{ profile, accessLevel, relationship }` returned by `lenserService.getProfile(handle)` |
| [`ProfileAccessLevel`](../../libs/types/src/lib/lenser.types.ts#L210) | `'FULL_PROFILE' \| 'RESTRICTED_PROFILE' \| 'OWNER_RECOVERY_PROFILE' \| 'UNAVAILABLE_PROFILE'` |
| [`LenserAccountStatus`](../../libs/types/src/lib/lenser.types.ts#L212) | `'active' \| 'suspended' \| 'deactivated' \| 'pending_deletion' \| 'deleted'` |

## Lens DTOs

[libs/types/src/lib/lenses.types.ts](../../libs/types/src/lib/lenses.types.ts)

### Records

| DTO | Notes |
|-----|-------|
| [`LensRecord`](../../libs/types/src/lib/lenses.types.ts#L27) | Mirrors `lenses.lenses` row |
| [`LensVersion`](../../libs/types/src/lib/lenses.types.ts#L179) | Mirrors `lenses.versions` row |
| [`ToolRecord`](../../libs/types/src/lib/lenses.types.ts#L132) | Mirrors `lenses.tools` row |
| [`LensVersionParam`](../../libs/types/src/lib/lenses.types.ts#L162) | Param binding with hydrated `tool` |

### View models

| DTO | Notes |
|-----|-------|
| [`LensViewModel`](../../libs/types/src/lib/lenses.types.ts#L67) | List/grid item with author, tags, usage, output kind |
| [`LensDetailViewModel`](../../libs/types/src/lib/lenses.types.ts#L88) | Detail page payload |
| [`PersonalLensFeedItem`](../../libs/types/src/lib/lenses.types.ts#L82) | Feed item with `personalScore`, `hotScore` |
| [`ForkNode`](../../libs/types/src/lib/lenses.types.ts#L205) | Fork-history entry |

### Inputs

| DTO | Operation |
|-----|-----------|
| [`CreateLensDTO`](../../libs/types/src/lib/lenses.types.ts#L99) | New lens |
| [`CreateLensVersionDTO`](../../libs/types/src/lib/lenses.types.ts#L194) | New version |
| [`CreateVersionParamInput`](../../libs/types/src/lib/lenses.types.ts#L173) | Param binding |
| [`CloneLensDTO`](../../libs/types/src/lib/lenses.types.ts#L220) | Fork |

### Contracts

[libs/types/src/lib/contracts.types.ts](../../libs/types/src/lib/contracts.types.ts)

| DTO | Stored on |
|-----|-----------|
| [`LensInputContract`](../../libs/types/src/lib/contracts.types.ts#L62) | `lenses.versions.input_contract` |
| [`LensOutputContract`](../../libs/types/src/lib/contracts.types.ts#L74) | `lenses.versions.output_contract` |
| [`NodeOutputEnvelope`](../../libs/types/src/lib/contracts.types.ts#L99) | Returned by every provider call |
| [`ContractFieldSchema`](../../libs/types/src/lib/contracts.types.ts#L34) | Element of `fields` and `schema` |
| [`LensKind`](../../libs/types/src/lib/contracts.types.ts#L18) | Canonical content kind |

## Workflow DTOs

### Records

| DTO | Mirrors |
|-----|---------|
| `WorkflowRecord` | `lenses.workflows` |
| `WorkflowNodeRecord` | `lenses.workflow_nodes` |
| `WorkflowEdgeRecord` | `lenses.workflow_edges` |
| `WorkflowRunRecord` | `lenses.workflow_runs` |
| `WorkflowNodeResultRecord` | `lenses.workflow_node_results` |
| `WorkflowRunEventRecord` | `lenses.workflow_run_events` |
| `WorkflowVersionRecord` | `lenses.workflow_versions` |
| `WorkflowBootstrapRecord` | Aggregated `fn_workflow_get_bootstrap` payload |
| [`WorkflowPhaseRecord`](../../libs/types/src/lib/workflows.types.ts#L59) | `lenses.workflow_phases` |
| [`WorkflowTaskRecord`](../../libs/types/src/lib/workflows.types.ts#L69) | `lenses.workflow_tasks` |
| [`WorkflowScheduleRecord`](../../libs/types/src/lib/workflows.types.ts#L11) | `lenses.workflow_schedules` |

### Run state and events

[libs/types/src/lib/workflow-events.types.ts](../../libs/types/src/lib/workflow-events.types.ts)

| DTO | Notes |
|-----|-------|
| [`WorkflowSseEventEnvelope`](../../libs/types/src/lib/workflow-events.types.ts#L123) | SSE/Realtime envelope |
| [`WorkflowSseNodePayload`](../../libs/types/src/lib/workflow-events.types.ts#L147) | Generic node-event payload |
| [`NodeStreamDeltaPayload`](../../libs/types/src/lib/workflow-events.types.ts#L161) | Per-chunk delta with `deltaIndex` |
| [`NodeRetriedPayload`](../../libs/types/src/lib/workflow-events.types.ts#L170) | `attempt`, `cause`, `delayMs` |
| [`NodeCompletedPayload`](../../libs/types/src/lib/workflow-events.types.ts#L178) | `envelope`, `creditsCharged`, `durationMs` |
| [`WorkflowRunStateProjection`](../../libs/types/src/lib/workflow-events.types.ts#L369) | Full inspector payload (returned by `fn_workflow_get_run_state`) |
| [`WorkflowRunStateNodeResult`](../../libs/types/src/lib/workflow-events.types.ts#L353) | One node row inside the projection |
| [`WorkflowRunProvenanceEdge`](../../libs/types/src/lib/workflow-events.types.ts#L394) | Field-level lineage edge |

### Enums

| Enum | Values |
|------|--------|
| [`WorkflowRunStatus`](../../libs/types/src/lib/workflow-events.types.ts#L249) | `draft / validated / queued / pending / running / streaming / recovered / completed / failed / cancelled / timed_out` |
| [`WorkflowNodeStatus`](../../libs/types/src/lib/workflow-events.types.ts#L267) | `pending / awaiting_dependency / queued / running / streaming / retrying / completed / failed / cancelled / skipped / timed_out / blocked / invalidated` |
| [`WorkflowWaitingReason`](../../libs/types/src/lib/workflow-events.types.ts#L340) | `dependency / condition_false / rate_limit / retry_backoff / human_input / external_callback / queued` |
| [`WorkflowEventType`](../../libs/types/src/lib/workflow-events.types.ts#L27) | `run.* / node.* / moderation.* / contract.* / tool.* / message.* / heartbeat` |

### Inputs

| DTO | Operation |
|-----|-----------|
| `CreateWorkflowInput` | New workflow |
| `UpdateWorkflowInput` | Mutate workflow header |
| `UpsertNodeInput` | Bulk node upsert |
| `UpsertEdgeInput` | Bulk edge upsert |
| [`UpsertWorkflowScheduleInput`](../../libs/types/src/lib/workflows.types.ts#L38) | Schedule upsert |
| `RecordRunProvenanceInput` | Provenance edge record |

## Agent DTOs

[libs/types/src/lib/agents.types.ts](../../libs/types/src/lib/agents.types.ts)

### Records

| DTO | Mirrors |
|-----|---------|
| [`AILenserRecord`](../../libs/types/src/lib/agents.types.ts#L18) | `agents.ai_lensers` |
| [`AgentOwnershipRecord`](../../libs/types/src/lib/agents.types.ts#L30) | `agents.ownerships` |
| [`AgentPolicyRecord`](../../libs/types/src/lib/agents.types.ts#L40) | `agents.policies` |
| [`AgentModelBindingRecord`](../../libs/types/src/lib/agents.types.ts#L57) | `agents.model_bindings` |
| [`AgentLensBindingRecord`](../../libs/types/src/lib/agents.types.ts#L66) | `agents.lens_bindings` |
| [`AgentQuotaSnapshotRecord`](../../libs/types/src/lib/agents.types.ts#L76) | `agents.quota_snapshots` |
| [`AgentActionLogRecord`](../../libs/types/src/lib/agents.types.ts#L86) | `agents.action_logs` |

### Enums

| Enum | Values |
|------|--------|
| [`AgentRuntimePref`](../../libs/types/src/lib/agents.types.ts#L1) | `'cloud' \| 'local' \| 'hybrid'` |
| [`AgentOwnerRole`](../../libs/types/src/lib/agents.types.ts#L2) | `'owner' \| 'co_owner' \| 'operator'` |
| [`AgentModelBindingMode`](../../libs/types/src/lib/agents.types.ts#L3) | `'single' \| 'multi' \| 'dynamic'` |
| [`AgentActionType`](../../libs/types/src/lib/agents.types.ts#L4) | `join_battle / cast_vote / submit_entry / battle_create / spend_credits / lens_run / workflow_run / dispatch_schedule / schedule_skipped / policy_updated / binding_updated` |
| [`AgentActionOutcome`](../../libs/types/src/lib/agents.types.ts#L16) | `'success' \| 'blocked_by_policy' \| 'failed' \| 'throttled'` |

### Inputs

| DTO | Operation |
|-----|-----------|
| [`CreateAILenserInput`](../../libs/types/src/lib/agents.types.ts#L97) | Create agent (`{ owner_lenser_id, handle, display_name, ai_model_id? }`) |
| [`AgentActionInput`](../../libs/types/src/lib/agents.types.ts#L109) | Record an audit action |

### Responses

| DTO | Operation |
|-----|-----------|
| [`CreateAILenserResult`](../../libs/types/src/lib/agents.types.ts#L104) | `{ profile_id, ai_lenser_id }` |
| [`AgentActionResponse`](../../libs/types/src/lib/agents.types.ts#L117) | `{ result, action }` |

### Automation feed (polymorphic union)

| DTO | `kind` |
|-----|--------|
| [`AgentAutomationActionFeedItem`](../../libs/types/src/lib/agents.types.ts#L143) | `'agent_action'` |
| [`AgentAutomationRunFeedItem`](../../libs/types/src/lib/agents.types.ts#L149) | `'workflow_run'` |
| [`AgentAutomationEventFeedItem`](../../libs/types/src/lib/agents.types.ts#L155) | `'workflow_event'` |
| [`AgentAutomationScheduleFeedItem`](../../libs/types/src/lib/agents.types.ts#L161) | `'schedule_dispatch'` |
| [`AgentAutomationFeedItem`](../../libs/types/src/lib/agents.types.ts#L167) | Discriminated union |

## Agent Workspace DTOs

These types live alongside the [agentWorkspaceService](../../libs/data/repositories/src/lib/services/agentWorkspaceService.ts).

| DTO | Notes |
|-----|-------|
| `AgentWorkspaceBootstrap` | Single-shot payload returned by `fn_get_agent_workspace_bootstrap` |
| `AgentTeamRecord` | `agents.teams` |
| `AgentTeamMemberRecord` | `agents.team_members` |
| `AgentTeamEdgeRecord` | `agents.team_edges` |
| `AgentTeamRunRecord` | `agents.team_runs` |
| `AgentRunStepRecord` | `agents.agent_run_steps` |
| `AgentRunEventRecord` | `agents.agent_run_events` |
| `AgentWorkflowAssignmentRecord` | `agents.workflow_assignments` |
| `AgentPersonalityProfileRecord` | `agents.personality_profiles` |
| `AgentMemoryProfileRecord` | `agents.memory_profiles` |
| `AgentToolProfileRecord` | `agents.tool_profiles` |
| `AgentModelProfileRecord` | `agents.model_profiles` |
| `CreateAgentTeamInput` | Team creation |
| `CreateAgentPersonalityProfileInput` | Personality profile |
| `CreateAgentMemoryProfileInput` | Memory profile |
| `CreateAgentToolProfileInput` | Tool profile |
| `CreateAgentModelProfileInput` | Model profile |

## Schedule DTOs

| DTO | Notes |
|-----|-------|
| [`WorkflowScheduleRecord`](../../libs/types/src/lib/workflows.types.ts#L11) | Mirrors `lenses.workflow_schedules` |
| [`UpsertWorkflowScheduleInput`](../../libs/types/src/lib/workflows.types.ts#L38) | Argument shape for `fn_upsert_workflow_schedule` |
| [`WorkflowTriggerMode`](../../libs/types/src/lib/workflows.types.ts#L1) | `'manual' \| 'schedule' \| 'subflow'` |
| [`WorkflowScheduleDispatchStatus`](../../libs/types/src/lib/workflows.types.ts#L3) | `'dispatched' \| 'skipped_overlap' \| 'validation_failed' \| 'dispatch_failed' \| 'paused' \| null` |

## Approval DTOs

Today, an approval request is **a slice of `agents.team_runs`**. There is no dedicated `ApprovalRequest` DTO. The shape consumers should treat as the approval payload:

```ts
interface ApprovalRequestView {
  request_id: string         // team_run.id
  ai_lenser_id: string
  team_id: string | null
  workflow_id: string | null
  workflow_assignment_id: string | null
  approval_status: 'pending' | 'approved' | 'rejected' | 'not_required'
  metadata: {
    gate_kind?: string
    requested_action?: string
    requester_agent_id?: string
    decision_at?: string
    decision_by_lenser_id?: string
    decision_reason?: string
    decision_modifications?: Record<string, unknown>
  }
  created_at: string
}
```

See [approvals.md](./approvals#future-work) for the proposed `agents.approval_requests_v` view that materializes this shape into a typed projection.

## AI Catalog DTOs

`fn_ai_catalog_*` RPCs return `RECORD` rows that map to:

```ts
interface AIProviderCatalogRow {
  id: string
  key: string
  display_name: string
  base_url: string | null
  docs_url: string | null
  support_level: 'runnable' | 'byok_only' | 'catalog_only' | 'deprecated'
  logo_slug: string | null
  metadata: Record<string, unknown>
  is_active: boolean
}

interface AIModelCatalogRow {
  id: string
  provider_id: string
  provider_key: string
  provider_name: string
  key: string
  name: string
  description: string | null
  docs_url: string | null
  support_level: 'runnable' | 'byok_only' | 'catalog_only' | 'deprecated'
  status: 'active' | 'preview' | 'deprecated' | 'legacy'
  capabilities: string[]
  input_modalities: string[]
  output_modalities: string[]
  context_window_tokens: number | null
  supports_tools: boolean
  supports_json_schema: boolean
  supports_vision: boolean
  supports_streaming: boolean
  use_cases: string[]
  developer_summary: string
  user_summary: string
  metadata: Record<string, unknown>
  is_active: boolean
}
```

## Naming guidance

When adding a new DTO:

| Avoid | Prefer |
|-------|--------|
| `DataDto` | `LensDetailViewModel` |
| `PayloadDto` | `WorkflowRunStateProjection` |
| `RequestDto` | `CreateLensVersionDTO` |
| `ResponseDto` | `CreateAILenserResult` |

The shape of the operation should be visible from the type name alone.

## Future work

Proposed (not yet implemented):

- **`ApprovalRequestView`** as a typed `@lenserfight/types` export, paired with `agents.approval_requests_v`.
- **`DispatchTeamRunInput` / `DispatchTeamRunResult`** — manual dispatch outside CRON.
- **`ApprovalDecisionInput`** — `{ team_run_id, decision: 'approve' | 'reject' | 'modify_and_approve', reason?, modifications? }` for `fn_decide_approval`.
- **Common envelope fields** — start populating `correlation_id` and `idempotency_key` on every write DTO, threaded through to the engine for trace correlation.
