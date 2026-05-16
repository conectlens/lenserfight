import type {
  AgentOwnershipDelegateRecord,
  AgentMemoryProfileRecord,
  AgentModelProfileRecord,
  AgentPersonalityProfileRecord,
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
  AgentTeamRecord,
  AgentToolProfileRecord,
  AgentWorkspaceBootstrap,
  ApprovalDecisionInput,
  ApprovalDecisionResult,
  ApprovalRequestView,
  CostSummary,
  CrossAgentFeedItem,
} from '@lenserfight/types'

import { type CreateAgentMemoryProfileInput,
  type CreateAgentModelProfileInput,
  type CreateAgentPersonalityProfileInput,
  type CreateAgentTeamInput,
  type CreateAgentToolProfileInput,
  type CreateEvaluationCaseInput,
  type CreateWorkflowAssignmentInput,
  type CreateTeamRunInput,
  type UpsertAgentRunStepInput,
  type UpsertAgentOwnershipInput,
  type ListApprovalRequestsOptions,
} from '../repositories/agentWorkspaceRepository'
import type { EvaluationBaselineRecord, EvaluationRubricCriterion, EvaluationRubricRecord } from '@lenserfight/types'
import { createAgentWorkspaceRepository } from '../factory'
import { supabase } from '@lenserfight/data/supabase'

const agentWorkspaceRepo = createAgentWorkspaceRepository()

// ── AR: BYOK key management ──────────────────────────────────────────────────

export interface ByokKeyHint {
  provider: string
  key_hint: string | null
  label: string | null
  is_valid: boolean
}

async function listByokKeyHints(agentId: string): Promise<ByokKeyHint[]> {
  const { data, error } = await supabase.rpc('fn_byok_key_hint', { p_agent_id: agentId })
  if (error) throw error
  return (data ?? []) as ByokKeyHint[]
}

async function rotateByokKey(
  agentId: string,
  provider: string,
  newKeyEncrypted: string,
  newHint: string,
): Promise<void> {
  const { error } = await supabase.rpc('fn_byok_key_rotate', {
    p_agent_id:      agentId,
    p_provider:      provider,
    p_new_encrypted: newKeyEncrypted,
    p_new_hint:      newHint,
  })
  if (error) throw error
}

async function revokeByokKey(agentId: string, provider: string): Promise<void> {
  const { error } = await supabase.rpc('fn_byok_key_revoke', {
    p_agent_id: agentId,
    p_provider:  provider,
  })
  if (error) throw error
}

async function registerByokKey(
  agentId: string,
  provider: string,
  keyEncrypted: string,
  keyHint: string,
  label?: string,
  expiresAt?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('fn_byok_key_register', {
    p_agent_id:      agentId,
    p_provider:      provider,
    p_key_encrypted: keyEncrypted,
    p_key_hint:      keyHint,
    p_label:         label ?? null,
    p_expires_at:    expiresAt ?? null,
  })
  if (error) throw error
}

// ── BZ: battle-scoped validation, usage logging, rotation check ──────────────

export interface ByokValidationResult {
  valid: boolean
  reason: string | null
  key_id?: string | null
}

export interface ByokUsageRow {
  id: string
  key_id: string
  battle_id: string | null
  model_id: string
  called_at: string
  token_count: number
  caller_role: string
}

export interface ByokRotationDueRow {
  id: string
  agent_id: string
  provider: string
  key_hint: string | null
  label: string | null
  last_rotated_at: string | null
}

async function validateForBattle(battleId: string, contenderId: string): Promise<ByokValidationResult> {
  const { data, error } = await supabase.rpc('fn_byok_validate_for_battle', {
    p_battle_id:    battleId,
    p_contender_id: contenderId,
  })
  if (error) throw error
  return (data ?? { valid: false, reason: 'unknown' }) as ByokValidationResult
}

async function logUsage(keyId: string, battleId: string | null, modelId: string, tokenCount: number): Promise<void> {
  const { error } = await supabase.rpc('fn_byok_log_usage', {
    p_key_id:       keyId,
    p_battle_id:    battleId,
    p_model_id:     modelId,
    p_token_count:  tokenCount,
  })
  if (error) throw error
}

async function listRotationDue(): Promise<ByokRotationDueRow[]> {
  const { data, error } = await supabase.rpc('fn_byok_rotation_due')
  if (error) throw error
  return (data ?? []) as ByokRotationDueRow[]
}

async function listByokUsage(keyId: string, limit = 50): Promise<ByokUsageRow[]> {
  const { data, error } = await supabase
    .from('audit.byok_key_usage')
    .select('id, key_id, battle_id, model_id, called_at, token_count, caller_role')
    .eq('key_id', keyId)
    .order('called_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ByokUsageRow[]
}

export type {
  CreateAgentMemoryProfileInput,
  CreateAgentModelProfileInput,
  CreateAgentPersonalityProfileInput,
  CreateAgentTeamInput,
  CreateAgentToolProfileInput,
  CreateEvaluationCaseInput,
  CreateWorkflowAssignmentInput,
  CreateTeamRunInput,
  UpsertAgentRunStepInput,
  UpsertAgentOwnershipInput,
  ListApprovalRequestsOptions,
  EvaluationRubricRecord,
  EvaluationBaselineRecord,
  EvaluationRubricCriterion,
}

export const agentWorkspaceService = {
  getWorkspaceBootstrap: (handle: string): Promise<AgentWorkspaceBootstrap | null> =>
    agentWorkspaceRepo.getWorkspaceBootstrap(handle),

  createTeam: (input: CreateAgentTeamInput): Promise<AgentTeamRecord | null> =>
    agentWorkspaceRepo.createTeam(input),

  listTeamMembers: (teamId: string): Promise<AgentTeamMemberRecord[]> =>
    agentWorkspaceRepo.listTeamMembers(teamId),

  listTeamEdges: (teamId: string): Promise<AgentTeamEdgeRecord[]> =>
    agentWorkspaceRepo.listTeamEdges(teamId),

  createPersonalityProfile: (
    input: CreateAgentPersonalityProfileInput
  ): Promise<AgentPersonalityProfileRecord | null> =>
    agentWorkspaceRepo.createPersonalityProfile(input),

  createMemoryProfile: (
    input: CreateAgentMemoryProfileInput
  ): Promise<AgentMemoryProfileRecord | null> =>
    agentWorkspaceRepo.createMemoryProfile(input),

  createToolProfile: (input: CreateAgentToolProfileInput): Promise<AgentToolProfileRecord | null> =>
    agentWorkspaceRepo.createToolProfile(input),

  createModelProfile: (
    input: CreateAgentModelProfileInput
  ): Promise<AgentModelProfileRecord | null> => agentWorkspaceRepo.createModelProfile(input),

  listApprovalRequests: (
    aiLenserId: string,
    options?: ListApprovalRequestsOptions
  ): Promise<ApprovalRequestView[]> =>
    agentWorkspaceRepo.listApprovalRequests(aiLenserId, options),

  getApprovalRequest: (requestId: string): Promise<ApprovalRequestView | null> =>
    agentWorkspaceRepo.getApprovalRequest(requestId),

  decideApproval: (input: ApprovalDecisionInput): Promise<ApprovalDecisionResult> =>
    agentWorkspaceRepo.decideApproval(input),

  getHumanActivityFeed: (
    humanLenserId: string,
    limit?: number,
    offset?: number
  ): Promise<CrossAgentFeedItem[]> =>
    agentWorkspaceRepo.getHumanActivityFeed(humanLenserId, limit, offset),

  getCostSummary: (aiLenserId: string): Promise<CostSummary> =>
    agentWorkspaceRepo.getCostSummary(aiLenserId),
  listAgentOwnerships: (aiLenserId: string): Promise<AgentOwnershipDelegateRecord[]> =>
    agentWorkspaceRepo.listAgentOwnerships(aiLenserId),
  upsertAgentOwnership: (
    input: UpsertAgentOwnershipInput
  ): Promise<AgentOwnershipDelegateRecord> => agentWorkspaceRepo.upsertAgentOwnership(input),
  revokeAgentOwnership: (ownershipId: string): Promise<void> =>
    agentWorkspaceRepo.revokeAgentOwnership(ownershipId),

  // Scratchpad
  listScratchpadRuns: agentWorkspaceRepo.listScratchpadRuns.bind(agentWorkspaceRepo),
  createScratchpadRun: agentWorkspaceRepo.createScratchpadRun.bind(agentWorkspaceRepo),
  completeScratchpadRun: agentWorkspaceRepo.completeScratchpadRun.bind(agentWorkspaceRepo),
  promoteScratchpadToMemory: agentWorkspaceRepo.promoteScratchpadToMemory.bind(agentWorkspaceRepo),

  // Evaluations
  listEvaluations: agentWorkspaceRepo.listEvaluations.bind(agentWorkspaceRepo),
  createEvaluation: agentWorkspaceRepo.createEvaluation.bind(agentWorkspaceRepo),
  runEvaluation: agentWorkspaceRepo.runEvaluation.bind(agentWorkspaceRepo),
  getEvaluationResults: agentWorkspaceRepo.getEvaluationResults.bind(agentWorkspaceRepo),
  listEvaluationRuns: agentWorkspaceRepo.listEvaluationRuns.bind(agentWorkspaceRepo),

  // Tools registry
  listToolRegistry: agentWorkspaceRepo.listToolRegistry.bind(agentWorkspaceRepo),
  registerTool: agentWorkspaceRepo.registerTool.bind(agentWorkspaceRepo),
  assignTool: agentWorkspaceRepo.assignTool.bind(agentWorkspaceRepo),
  revokeTool: agentWorkspaceRepo.revokeTool.bind(agentWorkspaceRepo),
  listToolAssignments: agentWorkspaceRepo.listToolAssignments.bind(agentWorkspaceRepo),

  // Fleet aggregations
  getFleetOverview: agentWorkspaceRepo.getFleetOverview.bind(agentWorkspaceRepo),
  listFleetRuns: agentWorkspaceRepo.listFleetRuns.bind(agentWorkspaceRepo),
  listFleetLogs: agentWorkspaceRepo.listFleetLogs.bind(agentWorkspaceRepo),
  listAgentRunEvents: agentWorkspaceRepo.listAgentRunEvents.bind(agentWorkspaceRepo),

  // Provider configs (BYOK)
  listProviderConfigs: agentWorkspaceRepo.listProviderConfigs.bind(agentWorkspaceRepo),
  configureProvider: agentWorkspaceRepo.configureProvider.bind(agentWorkspaceRepo),
  testProvider: agentWorkspaceRepo.testProvider.bind(agentWorkspaceRepo),

  // Workspace settings
  getWorkspaceSettings: agentWorkspaceRepo.getWorkspaceSettings.bind(agentWorkspaceRepo),
  updateWorkspaceSettings: agentWorkspaceRepo.updateWorkspaceSettings.bind(agentWorkspaceRepo),
  exportWorkspace: agentWorkspaceRepo.exportWorkspace.bind(agentWorkspaceRepo),
  requestWorkspaceDeletion: agentWorkspaceRepo.requestWorkspaceDeletion.bind(agentWorkspaceRepo),

  // Profile mutations
  listMemoryProfiles: agentWorkspaceRepo.listMemoryProfiles.bind(agentWorkspaceRepo),
  updateMemoryProfile: agentWorkspaceRepo.updateMemoryProfile.bind(agentWorkspaceRepo),
  deleteMemoryProfile: agentWorkspaceRepo.deleteMemoryProfile.bind(agentWorkspaceRepo),
  updatePersonalityProfile: agentWorkspaceRepo.updatePersonalityProfile.bind(agentWorkspaceRepo),
  deletePersonalityProfile: agentWorkspaceRepo.deletePersonalityProfile.bind(agentWorkspaceRepo),
  updateToolProfile: agentWorkspaceRepo.updateToolProfile.bind(agentWorkspaceRepo),
  deleteToolProfile: agentWorkspaceRepo.deleteToolProfile.bind(agentWorkspaceRepo),
  updateModelProfile: agentWorkspaceRepo.updateModelProfile.bind(agentWorkspaceRepo),
  deleteModelProfile: agentWorkspaceRepo.deleteModelProfile.bind(agentWorkspaceRepo),

  // Team mutations
  updateTeam: agentWorkspaceRepo.updateTeam.bind(agentWorkspaceRepo),
  deleteTeam: agentWorkspaceRepo.deleteTeam.bind(agentWorkspaceRepo),
  addTeamMember: agentWorkspaceRepo.addTeamMember.bind(agentWorkspaceRepo),
  updateTeamMember: agentWorkspaceRepo.updateTeamMember.bind(agentWorkspaceRepo),
  deleteTeamMember: agentWorkspaceRepo.deleteTeamMember.bind(agentWorkspaceRepo),
  upsertTeamEdge: agentWorkspaceRepo.upsertTeamEdge.bind(agentWorkspaceRepo),
  deleteTeamEdge: agentWorkspaceRepo.deleteTeamEdge.bind(agentWorkspaceRepo),

  // Run step inspection
  listAgentRunSteps: agentWorkspaceRepo.listAgentRunSteps.bind(agentWorkspaceRepo),
  cancelAgentRun: agentWorkspaceRepo.cancelAgentRun.bind(agentWorkspaceRepo),
  retryAgentRun: agentWorkspaceRepo.retryAgentRun.bind(agentWorkspaceRepo),

  // Workflow assignments
  listWorkflowAssignments: agentWorkspaceRepo.listWorkflowAssignments.bind(agentWorkspaceRepo),
  createWorkflowAssignment: agentWorkspaceRepo.createWorkflowAssignment.bind(agentWorkspaceRepo),
  updateWorkflowAssignment: agentWorkspaceRepo.updateWorkflowAssignment.bind(agentWorkspaceRepo),
  deleteWorkflowAssignment: agentWorkspaceRepo.deleteWorkflowAssignment.bind(agentWorkspaceRepo),

  // Evaluation cases
  listEvaluationCases: agentWorkspaceRepo.listEvaluationCases.bind(agentWorkspaceRepo),
  createEvaluationCase: agentWorkspaceRepo.createEvaluationCase.bind(agentWorkspaceRepo),
  deleteEvaluationCase: agentWorkspaceRepo.deleteEvaluationCase.bind(agentWorkspaceRepo),

  // Team run lifecycle
  createTeamRun: agentWorkspaceRepo.createTeamRun.bind(agentWorkspaceRepo),
  updateTeamRunStatus: agentWorkspaceRepo.updateTeamRunStatus.bind(agentWorkspaceRepo),
  appendTeamRunEvent: agentWorkspaceRepo.appendTeamRunEvent.bind(agentWorkspaceRepo),
  upsertAgentRunStep: agentWorkspaceRepo.upsertAgentRunStep.bind(agentWorkspaceRepo),

  // Evaluation rubrics
  listEvaluationRubrics: agentWorkspaceRepo.listEvaluationRubrics.bind(agentWorkspaceRepo),
  createEvaluationRubric: (
    evaluationId: string,
    criteria: EvaluationRubricCriterion[]
  ): Promise<EvaluationRubricRecord> =>
    agentWorkspaceRepo.createEvaluationRubric(evaluationId, criteria),

  // Evaluation baselines
  getEvaluationBaseline: (evaluationId: string): Promise<EvaluationBaselineRecord | null> =>
    agentWorkspaceRepo.getEvaluationBaseline(evaluationId),
  setEvaluationBaseline: (evaluationId: string, runId: string): Promise<EvaluationBaselineRecord> =>
    agentWorkspaceRepo.setEvaluationBaseline(evaluationId, runId),

  // Post-run evaluation trigger
  triggerPostRunEvaluations: agentWorkspaceRepo.triggerPostRunEvaluations.bind(agentWorkspaceRepo),

  // BZ: BYOK v2 — execution-layer: validation, usage audit, rotation check
  // UI key management is handled by apiKeysService (ai.keys / Vault) — not here.
  validateForBattle,
  logUsage,
  listRotationDue,
  listByokUsage,
}
