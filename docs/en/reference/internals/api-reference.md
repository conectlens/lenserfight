---
title: API Reference
description: Endpoint groups for ConnectedLenses, anchored in the existing service layer at libs/data/repositories. The frontend, CLI, and external clients all consume these contracts.
---

# API Reference

The ConnectedLenses API surface is the union of:

1. **Postgres RPCs** (callable via PostgREST and `supabase.rpc()`).
2. **Service-layer methods** in [libs/data/repositories/src/lib/services/](../../libs/data/repositories/src/lib/services/) that wrap RPCs with TypeScript types and feature-friendly signatures.

This document treats the **service layer as authoritative** because it is the contract the frontend, CLI, and external integrations all consume. Each endpoint group lists the relevant service module, its public methods, and the underlying Postgres RPC (or REST table).

> Naming convention: service methods use camelCase TypeScript names; Postgres RPCs use `fn_*` snake_case. The two are 1:1 except where called out.

## Lenses

**Service**: [`lensesService`](../../libs/data/repositories/src/lib/services/lensesService.ts)

| Method                                 | Purpose                                                       |
| -------------------------------------- | ------------------------------------------------------------- |
| `getLenses(offset, limit)`             | Paginated catalog of public lenses                            |
| `search(query, offset, limit)`         | Full-text search across lenses                                |
| `filter(tagSlug, offset, limit, sort)` | Filter by tag with `'newest' \| 'trending' \| 'popular'` sort |
| `sort(order, ...)`                     | Sort by `'newest' \| 'popular'`                               |
| `getTopLenses(limit)`                  | Top N lenses (homepage / showcase)                            |
| `getLenserLenses(handle)`              | All lenses authored by a specific Lenser                      |
| `getLensDetail(lensId)`                | `LensDetailViewModel` with versions, params, reactions        |
| `createLens(dto)`                      | Create a new lens (`CreateLensDTO`)                           |
| `updateLens(lensId, patch)`            | Partial update                                                |
| `cloneLens(dto)`                       | Fork an existing lens (optionally pinned to a version)        |
| `archiveLens(lensId)`                  | Soft-archive                                                  |
| `createVersion(dto)`                   | New version of an existing lens (`CreateLensVersionDTO`)      |
| `publishVersion(versionId)`            | Move version to `published`                                   |
| `getVersionParams(versionId)`          | Hydrated parameter list (with `tools` rows joined)            |

Underlying RPCs: `fn_render_version_body`, `fn_get_version_params_with_tools`, `fn_publish_lens_version`.

## Workflows

**Service**: [`workflowsService`](../../libs/data/repositories/src/lib/services/workflowsService.ts)

### CRUD

| Method                                           | RPC / Table                  |
| ------------------------------------------------ | ---------------------------- |
| `listByLenser(lenserId)`                         | `lenses.workflows` REST      |
| `listByLenserPaginated(lenserId, offset, limit)` | REST with range              |
| `getPopular(offset, limit, search?)`             | `fn_get_popular_workflows`   |
| `listTemplates(limit?, offset?)`                 | `fn_list_workflow_templates` |
| `getById(id)`                                    | `lenses.workflows` REST      |
| `getBootstrap(workflowId)`                       | `fn_get_workflow_bootstrap`  |
| `forkWorkflow(sourceId)`                         | `fn_fork_workflow`           |
| `createWorkflow(input)`                          | `fn_create_workflow`         |
| `updateWorkflow(id, input)`                      | `fn_update_workflow`         |
| `getNodes(workflowId)`                           | `lenses.workflow_nodes` REST |
| `getEdges(workflowId)`                           | `lenses.workflow_edges` REST |
| `upsertNodes(workflowId, nodes)`                 | `fn_upsert_workflow_nodes`   |
| `upsertEdges(workflowId, edges)`                 | `fn_upsert_workflow_edges`   |
| `deleteNode(nodeId)` / `deleteEdge(edgeId)`      | REST DELETE                  |

### Run lifecycle

| Method                                         | RPC / Table                                                                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `startRun(workflowId, ...)`                    | `fn_start_workflow_run`                                                                                                      |
| `getRun(runId)`                                | `lenses.workflow_runs` REST                                                                                                  |
| `getNodeResults(runId)`                        | `lenses.workflow_node_results` REST                                                                                          |
| `updateNodeResult(runId, nodeId, status, ...)` | `fn_update_workflow_node_result`                                                                                             |
| `updateRunStatus(runId, status)`               | `fn_update_workflow_run_status`                                                                                              |
| `getRunState(runId)`                           | `fn_get_workflow_run_state` (returns [`WorkflowRunStateProjection`](../../libs/types/src/lib/workflow-events.types.ts#L369)) |
| `getRunProvenance(runId)`                      | `fn_get_run_provenance`                                                                                                      |
| `recordRunProvenance(input)`                   | `fn_record_workflow_run_provenance`                                                                                          |
| `appendRunEvent(runId, type, payload)`         | `fn_append_workflow_run_event`                                                                                               |
| `listRunEvents(runId, afterEventId?, limit?)`  | `lenses.workflow_run_events` REST                                                                                            |
| `listRuns(workflowId, limit?, offset?)`        | `lenses.workflow_runs` REST                                                                                                  |

### Versions and phases

| Method                                                                     | Notes                           |
| -------------------------------------------------------------------------- | ------------------------------- |
| `getVersions(workflowId)`                                                  | `lenses.workflow_versions` REST |
| `createVersion(workflowId, changelog?)`                                    | `fn_create_workflow_version`    |
| `publishVersion(versionId)`                                                | `fn_publish_workflow_version`   |
| `restoreVersion(versionId)`                                                | `fn_restore_workflow_version`   |
| `listPhases(workflowId)` / `upsertPhase` / `deletePhase` / `reorderPhases` | `lenses.workflow_phases`        |
| `listTasks(phaseId)` / `listTasksByWorkflow` / `upsertTask` / `deleteTask` | `lenses.workflow_tasks`         |

### Schedules

| Method                       | RPC                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `getSchedules(workflowId?)`  | [`fn_get_workflow_schedules`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L692)   |
| `upsertSchedule(input)`      | [`fn_upsert_workflow_schedule`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L762) |
| `deleteSchedule(scheduleId)` | REST DELETE                                                                                                      |

## Agents

**Service**: [`agentsService`](../../libs/data/repositories/src/lib/services/agentsService.ts)

| Method                                           | Purpose                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `getAgentProfile(aiLenserId)`                    | `AgentProfileView` for an agent                                                                |
| `getAgentProfileByProfileId(profileId)`          | Resolve via `lensers.profiles.id`                                                              |
| `getAgentsByOwner(ownerLenserId)`                | All AI lensers owned by a human                                                                |
| `createAgent(input)`                             | Create an Agent Lenser ([`CreateAILenserInput`](../../libs/types/src/lib/agents.types.ts#L97)) |
| `recordAction(input)`                            | Audit entry for `agents.action_logs`                                                           |
| `getActionLogs(aiLenserId, limit?)`              | Recent agent actions                                                                           |
| `getAutomationFeed(aiLenserId, limit?, offset?)` | Polymorphic [`AgentAutomationFeedItem`](../../libs/types/src/lib/agents.types.ts#L167)         |
| `getQuotaSnapshot(aiLenserId, date?)`            | Daily usage                                                                                    |
| `getLensBindings(aiLenserId)`                    | `agents.lens_bindings` rows                                                                    |
| `getModelBindings(aiLenserId)`                   | `agents.model_bindings` rows                                                                   |
| `setMainLensBinding(aiLenserId, lensId, ...)`    | Promote a lens to default                                                                      |
| `setDefaultModelBinding(aiLenserId, modelId)`    | Promote a model to default                                                                     |
| `updatePolicy(aiLenserId, policy)`               | Mutate `agents.policies`                                                                       |
| `updateAgentProfile(profileId, patch)`           | Mutate `lensers.profiles` for the agent                                                        |
| `updatePersonality(aiLenserId, note)`            | `fn_update_agent_personality`                                                                  |

## Agent Workspace (Teams + Profiles)

**Service**: [`agentWorkspaceService`](../../libs/data/repositories/src/lib/services/agentWorkspaceService.ts)

| Method                            | RPC                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getWorkspaceBootstrap(handle)`   | [`fn_get_agent_workspace_bootstrap`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L917) — returns teams, members, edges, recent runs, profiles, assignments in one round trip |
| `createTeam(input)`               | INSERT into `agents.teams`                                                                                                                                                                                  |
| `listTeamMembers(teamId)`         | REST                                                                                                                                                                                                        |
| `listTeamEdges(teamId)`           | REST                                                                                                                                                                                                        |
| `createPersonalityProfile(input)` | INSERT into `agents.personality_profiles`                                                                                                                                                                   |
| `createMemoryProfile(input)`      | INSERT into `agents.memory_profiles`                                                                                                                                                                        |
| `createToolProfile(input)`        | INSERT into `agents.tool_profiles`                                                                                                                                                                          |
| `createModelProfile(input)`       | INSERT into `agents.model_profiles`                                                                                                                                                                         |

### Proposed methods (Future work)

| Method                                                          | Notes                                |
| --------------------------------------------------------------- | ------------------------------------ |
| `addTeamMember(teamId, agentId, role, lane, profiles)`          | INSERT `agents.team_members`         |
| `removeTeamMember(memberId)`                                    | DELETE                               |
| `addTeamEdge(teamId, sourceId, targetId, edgeType, isBlocking)` | INSERT `agents.team_edges`           |
| `createWorkflowAssignment(input)`                               | INSERT `agents.workflow_assignments` |
| `dispatchTeamRun(assignmentId, inputs?)`                        | Manual dispatch outside CRON         |
| `decideApproval(teamRunId, decision, reason?, modifications?)`  | Atomic `fn_decide_approval`          |

## AI Catalog

**Service**: [`aiCatalogService`](../../libs/data/repositories/src/lib/services/aiCatalogService.ts)

| Method                                  | RPC                                                                                                                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `listProviders()`                       | [`fn_ai_catalog_providers`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L520)                                                                  |
| `listModels(filters?)`                  | [`fn_ai_catalog_models`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L561) — accepts `provider_key`, `support_level`, `capability`, `modality` |
| `getModelDetail(providerKey, modelKey)` | [`fn_ai_catalog_model_detail`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L645)                                                               |

## Lensers (identity)

**Service**: [`lenserService`](../../libs/data/repositories/src/lib/services/lenserService.ts)

| Method                                                         | Notes                                                                                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `getActiveLenser()`                                            | The active workspace identity for the session                                                                              |
| `getAuthenticatedLenser()`                                     | The authenticated human Lenser                                                                                             |
| `getAuthenticatedProfileGate()`                                | Auth profile gate (account state)                                                                                          |
| `getProfile(handle)`                                           | [`ProfileAccessPayload`](../../libs/types/src/lib/lenser.types.ts#L222) — returns `profile`, `accessLevel`, `relationship` |
| `getLenserByHandle(handle)` / `getPublicLenserProfile(handle)` | Public-safe profile DTO                                                                                                    |
| `createLenserProfile(data)` / `updateLenserProfile(patch)`     | Identity mutations                                                                                                         |
| `requestAccountDeletion(handle)`                               | Account lifecycle                                                                                                          |
| `listLensers({ type, limit, offset })`                         | List lensers filtered by `'human' \| 'ai'`                                                                                 |

## Approvals

The approval queue is now exposed as a dedicated database-facing surface:

| Method                                       | RPC / source                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| `listApprovalRequests(aiLenserId, options?)` | `agents.approval_requests_v` via `agentWorkspaceService.listApprovalRequests` |
| `getApprovalRequest(requestId)`              | `agents.approval_requests_v` point lookup                                     |
| `decideApproval(input)`                      | `fn_decide_approval(team_run_id, decision, reason, modifications)`            |

The bootstrap payload still includes recent `team_runs`, but the queue itself should be treated as the dedicated approval read model.

## CLI executor

**Module**: [apps/cli/src/commands/](../../apps/cli/src/commands/)

The CLI consumes the same service layer when run with web-runtime adapters, and the same RPCs when run headless. See [cli-reference.md](./cli-reference) for the command surface.

## Authentication

All write RPCs require an authenticated session. Owner-only RPCs (anything that mutates `agents.*`) call [`agents.can_manage_ai_lenser()`](../../supabase/migrations/20260428010000_ai_catalog_agent_control_room.sql#L92) inside the function or via RLS.

Public-read RPCs (`fn_ai_catalog_providers`, `fn_ai_catalog_models`, `fn_ai_catalog_model_detail`) grant `EXECUTE` to `anon`.

## Error model

RPCs raise Postgres errors with SQLSTATE codes:

| Code    | Meaning                                                               |
| ------- | --------------------------------------------------------------------- |
| `42501` | Insufficient privilege (not owner / not authenticated)                |
| `22023` | Invalid argument (bad CRON, unknown assignee_type, cycle in workflow) |
| `23505` | Unique violation (duplicate team member)                              |
| `23503` | Foreign key violation (assignee not found)                            |

The service layer surfaces these as JS `Error` instances with `code` preserved on the message; UIs map to user-friendly copy.

## Future work

Proposed (not yet implemented):

- **Schedule pause/resume RPCs** — `fn_pause_workflow_schedule`, `fn_resume_workflow_schedule`. See [scheduling.md](./scheduling#future-work).
- **Team mutation RPCs** — `fn_add_team_member`, `fn_remove_team_member`, `fn_upsert_team_edge` so the client doesn't need INSERT/DELETE on the table directly.
- **Cross-agent activity feed hardening** — the current feed RPC ships, but needs continued rollout validation and richer filters.
