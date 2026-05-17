import type { ApiResponseEnvelope } from '@lenserfight/api/contracts'
import { paginatedResponse } from '@lenserfight/api/contracts'
import type {
  UpsertWorkflowScheduleInput,
  WorkflowPhaseRecord,
  WorkflowRunProvenanceEdge,
  WorkflowRunStateProjection,
  WorkflowScheduleRecord,
  WorkflowScheduleRunHistoryRecord,
  WorkflowTaskRecord,
} from '@lenserfight/types'
import { FileDataStore } from '@lenserfight/infra/storage'
import { generateUUID } from '@lenserfight/utils/text'
import type {
  CreateWorkflowInput,
  RecordRunProvenanceInput,
  TemplateWorkflowRecord,
  UpsertEdgeInput,
  UpsertNodeInput,
  UpdateNodeResultOptions,
  UpdateWorkflowInput,
  WorkflowBootstrapRecord,
  WorkflowEdgeRecord,
  WorkflowNodeRecord,
  WorkflowNodeResultRecord,
  WorkflowRecord,
  WorkflowRunEventRecord,
  WorkflowRunRecord,
  WorkflowVersionRecord,
  WorkflowsListFilter,
  WorkflowsRepositoryPort,
} from '../workflowsRepository'

const FILE_MODE_LENSER_ID = 'file-lenser-00000000-0000-0000-0000-000000000001'

const workflowStore = new FileDataStore<WorkflowRecord>('workflows')
const nodeStore = new FileDataStore<WorkflowNodeRecord>('workflow_nodes')
const edgeStore = new FileDataStore<WorkflowEdgeRecord>('workflow_edges')
const runStore = new FileDataStore<WorkflowRunRecord>('workflow_runs')
const nodeResultStore = new FileDataStore<WorkflowNodeResultRecord>('workflow_node_results')

interface WorkflowRunEventRow extends WorkflowRunEventRecord {
  id: string // FileDataStore requires id field
}
const runEventStore = new FileDataStore<WorkflowRunEventRow>('workflow_run_events')
const versionStore = new FileDataStore<WorkflowVersionRecord>('workflow_versions')

export class FileWorkflowsRepository implements WorkflowsRepositoryPort {
  async listByLenser(lenserId: string): Promise<WorkflowRecord[]> {
    return workflowStore.findWhere((w) => w.lenser_id === lenserId)
  }

  async listByLenserPaginated(
    lenserId: string,
    offset: number,
    limit: number,
    _filter?: WorkflowsListFilter
  ): Promise<ApiResponseEnvelope<WorkflowRecord[]>> {
    const start = Date.now()
    const all = await workflowStore.findWhere((w) => w.lenser_id === lenserId)
    const sorted = all.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    const items = sorted.slice(offset, offset + limit)
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: sorted.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async getPopular(offset: number, limit: number): Promise<ApiResponseEnvelope<WorkflowRecord[]>> {
    const start = Date.now()
    const all = await workflowStore.findAll()
    const items = all.slice(offset, offset + limit)
    return paginatedResponse(
      items,
      { limit, offset, hasNextPage: all.length > offset + limit },
      { durationMs: Date.now() - start }
    )
  }

  async listTemplates(_limit?: number, _offset?: number): Promise<TemplateWorkflowRecord[]> {
    return []
  }

  async getById(id: string): Promise<WorkflowRecord | null> {
    return (await workflowStore.findById(id)) ?? null
  }

  async getBootstrap(workflowId: string): Promise<WorkflowBootstrapRecord | null> {
    const workflow = await this.getById(workflowId)
    if (!workflow) return null
    const [nodes, edges] = await Promise.all([
      this.getNodes(workflowId),
      this.getEdges(workflowId),
    ])
    return { workflow, nodes, edges }
  }

  async getNodes(workflowId: string): Promise<WorkflowNodeRecord[]> {
    return nodeStore.findWhere((n) => n.workflow_id === workflowId)
  }

  async getEdges(workflowId: string): Promise<WorkflowEdgeRecord[]> {
    return edgeStore.findWhere((e) => e.workflow_id === workflowId)
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowRecord> {
    const now = new Date().toISOString()
    const record: WorkflowRecord = {
      id: generateUUID(),
      lenser_id: FILE_MODE_LENSER_ID,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility ?? 'public',
      battle_count: 0,
      fork_count: 0,
      reaction_totals: {},
      parent_workflow_id: null,
      created_at: now,
      updated_at: now,
    }
    await workflowStore.save(record)
    return record
  }

  async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowRecord> {
    const existing = await workflowStore.findById(id)
    if (!existing) throw new Error(`Workflow not found: ${id}`)
    const updated: WorkflowRecord = {
      ...existing,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility,
      updated_at: new Date().toISOString(),
    }
    await workflowStore.save(updated)
    return updated
  }

  async forkWorkflow(sourceId: string): Promise<WorkflowRecord> {
    const source = await workflowStore.findById(sourceId)
    if (!source) throw new Error(`Source workflow not found: ${sourceId}`)
    const now = new Date().toISOString()
    const forked: WorkflowRecord = {
      ...source,
      id: generateUUID(),
      parent_workflow_id: sourceId,
      fork_count: 0,
      battle_count: 0,
      created_at: now,
      updated_at: now,
    }
    await workflowStore.save(forked)

    // Clone nodes and edges
    const [nodes, edges] = await Promise.all([this.getNodes(sourceId), this.getEdges(sourceId)])
    const nodeIdMap = new Map<string, string>()
    for (const node of nodes) {
      const newId = generateUUID()
      nodeIdMap.set(node.id, newId)
      await nodeStore.save({ ...node, id: newId, workflow_id: forked.id, created_at: now })
    }
    for (const edge of edges) {
      await edgeStore.save({
        ...edge,
        id: generateUUID(),
        workflow_id: forked.id,
        source_node_id: nodeIdMap.get(edge.source_node_id) ?? edge.source_node_id,
        target_node_id: nodeIdMap.get(edge.target_node_id) ?? edge.target_node_id,
      })
    }
    return forked
  }

  async upsertNodes(workflowId: string, inputs: UpsertNodeInput[]): Promise<WorkflowNodeRecord[]> {
    const now = new Date().toISOString()
    const results: WorkflowNodeRecord[] = []
    for (const input of inputs) {
      const id = input.id ?? generateUUID()
      const node: WorkflowNodeRecord = {
        id,
        workflow_id: workflowId,
        lens_id: input.lens_id,
        version_id: input.version_id ?? null,
        position_x: input.position_x,
        position_y: input.position_y,
        label: input.label ?? null,
        ordinal: input.ordinal ?? 0,
        config: input.config ?? null,
        created_at: now,
      }
      await nodeStore.save(node)
      results.push(node)
    }
    return results
  }

  async upsertEdges(workflowId: string, inputs: UpsertEdgeInput[]): Promise<WorkflowEdgeRecord[]> {
    const results: WorkflowEdgeRecord[] = []
    for (const input of inputs) {
      const id = input.id ?? generateUUID()
      const edge: WorkflowEdgeRecord = {
        id,
        workflow_id: workflowId,
        source_node_id: input.source_node_id,
        target_node_id: input.target_node_id,
        source_output_key: input.source_output_key ?? 'output',
        target_param_label: input.target_param_label,
        merge_strategy: input.merge_strategy ?? null,
        condition: input.condition ?? null,
      }
      await edgeStore.save(edge)
      results.push(edge)
    }
    return results
  }

  async deleteNode(nodeId: string): Promise<void> {
    await nodeStore.remove(nodeId)
  }

  async deleteEdge(edgeId: string): Promise<void> {
    await edgeStore.remove(edgeId)
  }

  async startRun(
    workflowId: string,
    inputs: Record<string, unknown> = {},
    globalModelId?: string,
    idempotencyKey?: string
  ): Promise<WorkflowRunRecord> {
    const now = new Date().toISOString()
    const run: WorkflowRunRecord = {
      id: generateUUID(),
      workflow_id: workflowId,
      triggered_by: FILE_MODE_LENSER_ID,
      status: 'pending',
      context_inputs: inputs,
      global_model_id: globalModelId ?? null,
      idempotency_key: idempotencyKey ?? null,
      started_at: null,
      completed_at: null,
      budget_credits: null,
      spent_credits: 0,
      cost_metadata: {},
      created_at: now,
    }
    await runStore.save(run)
    return run
  }

  async getRun(runId: string): Promise<WorkflowRunRecord | null> {
    return (await runStore.findById(runId)) ?? null
  }

  async getNodeResults(runId: string): Promise<WorkflowNodeResultRecord[]> {
    return nodeResultStore.findWhere((r) => r.run_id === runId)
  }

  async updateNodeResult(
    runId: string,
    nodeId: string,
    status: string,
    outputData?: Record<string, unknown>,
    errorMessage?: string,
    _options?: UpdateNodeResultOptions
  ): Promise<void> {
    const existing = await nodeResultStore.findWhere((r) => r.run_id === runId && r.node_id === nodeId)
    const id = existing[0]?.id ?? generateUUID()
    await nodeResultStore.save({
      id,
      run_id: runId,
      node_id: nodeId,
      status: status as WorkflowNodeResultRecord['status'],
      output_data: outputData ?? null,
      error_message: errorMessage ?? null,
      started_at: null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      input_tokens: 0,
      output_tokens: 0,
      cost_credits: 0,
    })
  }

  async updateRunStatus(runId: string, status: string): Promise<void> {
    const run = await runStore.findById(runId)
    if (!run) return
    await runStore.save({
      ...run,
      status: status as WorkflowRunRecord['status'],
      completed_at: ['completed', 'failed', 'cancelled'].includes(status)
        ? new Date().toISOString()
        : run.completed_at,
    })
  }

  async appendRunEvent(
    runId: string,
    type: string,
    payload: Record<string, unknown> = {}
  ): Promise<WorkflowRunEventRecord | null> {
    const id = generateUUID()
    const event: WorkflowRunEventRow = {
      id,
      event_id: Date.now(),
      type,
      run_id: runId,
      timestamp: new Date().toISOString(),
      payload,
    }
    await runEventStore.save(event)
    return event
  }

  async listRunEvents(runId: string, afterEventId?: number, _limit?: number): Promise<WorkflowRunEventRecord[]> {
    const all = await runEventStore.findWhere((e) => e.run_id === runId)
    if (afterEventId !== undefined) {
      return all.filter((e) => e.event_id > afterEventId)
    }
    return all
  }

  async getRunState(_runId: string): Promise<WorkflowRunStateProjection | null> {
    return null
  }

  async getRunProvenance(_runId: string): Promise<WorkflowRunProvenanceEdge[]> {
    return []
  }

  async recordRunProvenance(_input: RecordRunProvenanceInput): Promise<string> {
    return generateUUID()
  }

  async getSchedules(_workflowId?: string): Promise<WorkflowScheduleRecord[]> {
    return []
  }

  async upsertSchedule(_input: UpsertWorkflowScheduleInput): Promise<WorkflowScheduleRecord | null> {
    return null
  }

  async deleteSchedule(_scheduleId: string): Promise<void> {
    // No-op in file mode.
  }

  async getScheduleHistory(_scheduleId: string): Promise<WorkflowScheduleRunHistoryRecord[]> {
    return []
  }

  async getVersions(workflowId: string): Promise<WorkflowVersionRecord[]> {
    return versionStore.findWhere((v) => v.workflow_id === workflowId)
  }

  async createVersion(workflowId: string, changelog?: string): Promise<string> {
    const existing = await this.getVersions(workflowId)
    const record: WorkflowVersionRecord = {
      id: generateUUID(),
      workflow_id: workflowId,
      version_number: existing.length + 1,
      changelog: changelog ?? null,
      status: 'draft',
      published_at: null,
      created_by: FILE_MODE_LENSER_ID,
      created_at: new Date().toISOString(),
      node_count: 0,
      edge_count: 0,
    }
    await versionStore.save(record)
    return record.id
  }

  async publishVersion(versionId: string): Promise<void> {
    const version = await versionStore.findById(versionId)
    if (!version) return
    await versionStore.save({
      ...version,
      status: 'published',
      published_at: new Date().toISOString(),
    })
  }

  async restoreVersion(_versionId: string): Promise<void> {
    // No-op in file mode.
  }

  async listRuns(workflowId: string, limit = 20, offset = 0): Promise<WorkflowRunRecord[]> {
    const all = await runStore.findWhere((r) => r.workflow_id === workflowId)
    return all.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(offset, offset + limit)
  }

  async listPhases(_workflowId: string): Promise<WorkflowPhaseRecord[]> {
    return []
  }

  async upsertPhase(phase: Partial<WorkflowPhaseRecord> & { workflow_id: string }): Promise<WorkflowPhaseRecord> {
    const record: WorkflowPhaseRecord = {
      id: (phase as WorkflowPhaseRecord).id ?? generateUUID(),
      workflow_id: phase.workflow_id,
      title: phase.title ?? 'Untitled Phase',
      description: phase.description ?? null,
      ordinal: phase.ordinal ?? 0,
      created_at: (phase as WorkflowPhaseRecord).created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return record
  }

  async deletePhase(_phaseId: string): Promise<void> {
    // No-op in file mode.
  }

  async reorderPhases(_workflowId: string, _orderedIds: string[]): Promise<void> {
    // No-op in file mode.
  }

  async listTasks(_phaseId: string): Promise<WorkflowTaskRecord[]> {
    return []
  }

  async listTasksByWorkflow(_workflowId: string): Promise<WorkflowTaskRecord[]> {
    return []
  }

  async upsertTask(task: Partial<WorkflowTaskRecord> & { phase_id: string; workflow_id: string }): Promise<WorkflowTaskRecord> {
    return {
      id: (task as WorkflowTaskRecord).id ?? generateUUID(),
      phase_id: task.phase_id,
      workflow_id: task.workflow_id,
      title: task.title ?? 'Untitled Task',
      prompt_text: task.prompt_text ?? null,
      ordinal: task.ordinal ?? 0,
      created_at: (task as WorkflowTaskRecord).created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as WorkflowTaskRecord
  }

  async deleteTask(_taskId: string): Promise<void> {
    // No-op in file mode.
  }

  async reorderTasks(_phaseId: string, _orderedIds: string[]): Promise<void> {
    // No-op in file mode.
  }
}
