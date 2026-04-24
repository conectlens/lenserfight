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
} from '../repositories/workflowsRepository'
import type { UpsertWorkflowScheduleInput, WorkflowScheduleRecord } from '@lenserfight/types'

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
    errorMessage?: string
  ): Promise<void> =>
    workflowsRepo.updateNodeResult(runId, nodeId, status, outputData, errorMessage),

  updateRunStatus: (runId: string, status: string): Promise<void> =>
    workflowsRepo.updateRunStatus(runId, status),

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
}
