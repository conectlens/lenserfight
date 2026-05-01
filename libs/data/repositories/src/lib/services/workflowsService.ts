import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import {
  SupabaseWorkflowsRepository,
  type WorkflowRecord,
  type WorkflowNodeRecord,
  type WorkflowEdgeRecord,
  type WorkflowBootstrapRecord,
  type WorkflowRunRecord,
  type WorkflowNodeResultRecord,
  type WorkflowVersionRecord,
  type WorkflowRunEventRecord,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type UpsertNodeInput,
  type UpsertEdgeInput,
  type WorkflowsListFilter,
  type TemplateWorkflowRecord,
  type UpdateNodeResultOptions,
  type RecordRunProvenanceInput,
} from '../repositories/workflowsRepository'
import type {
  UpsertWorkflowScheduleInput,
  WorkflowScheduleRecord,
  WorkflowPhaseRecord,
  WorkflowTaskRecord,
  WorkflowRunStateProjection,
  WorkflowRunProvenanceEdge,
} from '@lenserfight/types'

const workflowsRepo = new SupabaseWorkflowsRepository()

export type {
  WorkflowRecord,
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  WorkflowBootstrapRecord,
  WorkflowRunRecord,
  WorkflowNodeResultRecord,
  WorkflowVersionRecord,
  WorkflowRunEventRecord,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  UpsertNodeInput,
  UpsertEdgeInput,
  WorkflowsListFilter,
  TemplateWorkflowRecord,
}
export type { UpsertWorkflowScheduleInput, WorkflowScheduleRecord }
export type { WorkflowPhaseRecord, WorkflowTaskRecord }
export type {
  UpdateNodeResultOptions,
  RecordRunProvenanceInput,
  WorkflowRunStateProjection,
  WorkflowRunProvenanceEdge,
}

export const workflowsService = {
  listByLenser: (lenserId: string): Promise<WorkflowRecord[]> =>
    workflowsRepo.listByLenser(lenserId),

  listByLenserPaginated: (
    lenserId: string,
    offset: number,
    limit: number,
    filter?: WorkflowsListFilter
  ): Promise<ApiResponseEnvelope<WorkflowRecord[]>> =>
    workflowsRepo.listByLenserPaginated(lenserId, offset, limit, filter),

  getPopular: (offset: number, limit: number, search?: string): Promise<ApiResponseEnvelope<WorkflowRecord[]>> =>
    workflowsRepo.getPopular(offset, limit, search),

  listTemplates: (limit?: number, offset?: number): Promise<TemplateWorkflowRecord[]> =>
    workflowsRepo.listTemplates(limit, offset),

  getById: (id: string): Promise<WorkflowRecord | null> =>
    workflowsRepo.getById(id),

  getBootstrap: (workflowId: string): Promise<WorkflowBootstrapRecord | null> =>
    workflowsRepo.getBootstrap(workflowId),

  forkWorkflow: (sourceId: string): Promise<WorkflowRecord> =>
    workflowsRepo.forkWorkflow(sourceId),

  getNodes: (workflowId: string): Promise<WorkflowNodeRecord[]> =>
    workflowsRepo.getNodes(workflowId),

  getEdges: (workflowId: string): Promise<WorkflowEdgeRecord[]> =>
    workflowsRepo.getEdges(workflowId),

  createWorkflow: (input: CreateWorkflowInput): Promise<WorkflowRecord> =>
    workflowsRepo.createWorkflow(input),

  updateWorkflow: (id: string, input: UpdateWorkflowInput): Promise<WorkflowRecord> =>
    workflowsRepo.updateWorkflow(id, input),

  upsertNodes: (workflowId: string, nodes: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]> =>
    workflowsRepo.upsertNodes(workflowId, nodes),

  upsertEdges: (workflowId: string, edges: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]> =>
    workflowsRepo.upsertEdges(workflowId, edges),

  deleteNode: (nodeId: string): Promise<void> =>
    workflowsRepo.deleteNode(nodeId),

  deleteEdge: (edgeId: string): Promise<void> =>
    workflowsRepo.deleteEdge(edgeId),

  startRun: (
    workflowId: string,
    inputs?: Record<string, unknown>,
    globalModelId?: string,
    idempotencyKey?: string,
  ): Promise<WorkflowRunRecord> =>
    workflowsRepo.startRun(workflowId, inputs, globalModelId, idempotencyKey),

  getRun: (runId: string): Promise<WorkflowRunRecord | null> =>
    workflowsRepo.getRun(runId),

  getNodeResults: (runId: string): Promise<WorkflowNodeResultRecord[]> =>
    workflowsRepo.getNodeResults(runId),

  updateNodeResult: (
    runId: string,
    nodeId: string,
    status: string,
    outputData?: Record<string, unknown>,
    errorMessage?: string,
    options?: UpdateNodeResultOptions,
  ): Promise<void> =>
    workflowsRepo.updateNodeResult(runId, nodeId, status, outputData, errorMessage, options),

  updateRunStatus: (runId: string, status: string): Promise<void> =>
    workflowsRepo.updateRunStatus(runId, status),

  // ── N8N-style execution inspector ───────────────────────────────────────────

  /**
   * Single-round-trip canonical run projection. Returns the active node,
   * waiting/executed counts, ordered node results, and provenance edge counts.
   */
  getRunState: (runId: string): Promise<WorkflowRunStateProjection | null> =>
    workflowsRepo.getRunState(runId),

  /**
   * Field-level cross-workflow provenance edges for one run. Combines both
   * `upstream` (data into this run) and `downstream` (data leaving this run).
   */
  getRunProvenance: (runId: string): Promise<WorkflowRunProvenanceEdge[]> =>
    workflowsRepo.getRunProvenance(runId),

  /** Records a single field-level data handoff between two nodes. */
  recordRunProvenance: (input: RecordRunProvenanceInput): Promise<string> =>
    workflowsRepo.recordRunProvenance(input),

  appendRunEvent: (
    runId: string,
    type: string,
    payload?: Record<string, unknown>,
  ): Promise<WorkflowRunEventRecord | null> =>
    workflowsRepo.appendRunEvent(runId, type, payload),

  listRunEvents: (runId: string, afterEventId?: number, limit?: number): Promise<WorkflowRunEventRecord[]> =>
    workflowsRepo.listRunEvents(runId, afterEventId, limit),

  getSchedules: (workflowId?: string): Promise<WorkflowScheduleRecord[]> =>
    workflowsRepo.getSchedules(workflowId),

  upsertSchedule: (input: UpsertWorkflowScheduleInput): Promise<WorkflowScheduleRecord | null> =>
    workflowsRepo.upsertSchedule(input),

  deleteSchedule: (scheduleId: string): Promise<void> =>
    workflowsRepo.deleteSchedule(scheduleId),

  getScheduleHistory: (scheduleId: string) =>
    workflowsRepo.getScheduleHistory(scheduleId),

  // ── Versioning ──────────────────────────────────────────────────────────────

  getVersions: (workflowId: string): Promise<WorkflowVersionRecord[]> =>
    workflowsRepo.getVersions(workflowId),

  createVersion: (workflowId: string, changelog?: string): Promise<string> =>
    workflowsRepo.createVersion(workflowId, changelog),

  publishVersion: (versionId: string): Promise<void> =>
    workflowsRepo.publishVersion(versionId),

  restoreVersion: (versionId: string): Promise<void> =>
    workflowsRepo.restoreVersion(versionId),

  // ── Run history ─────────────────────────────────────────────────────────────

  /** Paginated list of past runs for a workflow (owner-only). */
  listRuns: (workflowId: string, limit?: number, offset?: number): Promise<WorkflowRunRecord[]> =>
    workflowsRepo.listRuns(workflowId, limit, offset),

  // ── Phases ──────────────────────────────────────────────────────────────────

  listPhases: (workflowId: string): Promise<WorkflowPhaseRecord[]> =>
    workflowsRepo.listPhases(workflowId),

  upsertPhase: (phase: Partial<WorkflowPhaseRecord> & { workflow_id: string }): Promise<WorkflowPhaseRecord> =>
    workflowsRepo.upsertPhase(phase),

  deletePhase: (phaseId: string): Promise<void> =>
    workflowsRepo.deletePhase(phaseId),

  reorderPhases: (workflowId: string, orderedIds: string[]): Promise<void> =>
    workflowsRepo.reorderPhases(workflowId, orderedIds),

  // ── Tasks ───────────────────────────────────────────────────────────────────

  listTasks: (phaseId: string): Promise<WorkflowTaskRecord[]> =>
    workflowsRepo.listTasks(phaseId),

  listTasksByWorkflow: (workflowId: string): Promise<WorkflowTaskRecord[]> =>
    workflowsRepo.listTasksByWorkflow(workflowId),

  upsertTask: (task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }): Promise<WorkflowTaskRecord> =>
    workflowsRepo.upsertTask(task),

  deleteTask: (taskId: string): Promise<void> =>
    workflowsRepo.deleteTask(taskId),

  reorderTasks: (phaseId: string, orderedIds: string[]): Promise<void> =>
    workflowsRepo.reorderTasks(phaseId, orderedIds),
}
