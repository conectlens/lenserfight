import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import {
  SupabaseWorkflowsRepository,
  type WorkflowRecord,
  type WorkflowNodeRecord,
  type WorkflowEdgeRecord,
  type WorkflowRunRecord,
  type WorkflowNodeResultRecord,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
  type UpsertNodeInput,
  type UpsertEdgeInput,
  type WorkflowsListFilter,
} from '../repositories/workflowsRepository'

const workflowsRepo = new SupabaseWorkflowsRepository()

export type {
  WorkflowRecord,
  WorkflowNodeRecord,
  WorkflowEdgeRecord,
  WorkflowRunRecord,
  WorkflowNodeResultRecord,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  UpsertNodeInput,
  UpsertEdgeInput,
  WorkflowsListFilter,
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

  getById: (id: string): Promise<WorkflowRecord | null> =>
    workflowsRepo.getById(id),

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

  startRun: (workflowId: string, inputs?: Record<string, unknown>, globalModelId?: string): Promise<WorkflowRunRecord> =>
    workflowsRepo.startRun(workflowId, inputs, globalModelId),

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
}
