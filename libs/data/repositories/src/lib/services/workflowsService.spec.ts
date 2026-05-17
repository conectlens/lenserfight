import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRepo } = vi.hoisted(() => ({
  mockRepo: {
    listByLenser: vi.fn(),
    listByLenserPaginated: vi.fn(),
    getPopular: vi.fn(),
    listTemplates: vi.fn(),
    getById: vi.fn(),
    getBootstrap: vi.fn(),
    forkWorkflow: vi.fn(),
    getNodes: vi.fn(),
    getEdges: vi.fn(),
    createWorkflow: vi.fn(),
    updateWorkflow: vi.fn(),
    upsertNodes: vi.fn(),
    upsertEdges: vi.fn(),
    deleteNode: vi.fn(),
    deleteEdge: vi.fn(),
    startRun: vi.fn(),
    getRun: vi.fn(),
    getNodeResults: vi.fn(),
    updateNodeResult: vi.fn(),
    updateRunStatus: vi.fn(),
    getRunState: vi.fn(),
    getRunProvenance: vi.fn(),
    recordRunProvenance: vi.fn(),
    appendRunEvent: vi.fn(),
    listRunEvents: vi.fn(),
    getSchedules: vi.fn(),
    upsertSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    getScheduleHistory: vi.fn(),
    getVersions: vi.fn(),
    createVersion: vi.fn(),
    publishVersion: vi.fn(),
    restoreVersion: vi.fn(),
    listRuns: vi.fn(),
    listPhases: vi.fn(),
    upsertPhase: vi.fn(),
    deletePhase: vi.fn(),
    reorderPhases: vi.fn(),
    listTasks: vi.fn(),
    listTasksByWorkflow: vi.fn(),
    upsertTask: vi.fn(),
    deleteTask: vi.fn(),
    reorderTasks: vi.fn(),
  },
}))

vi.mock('../factory', () => ({
  createWorkflowsRepository: vi.fn(() => mockRepo),
}))

import { workflowsService } from './workflowsService'

const WORKFLOW_ID = 'workflow-uuid-1'
const RUN_ID = 'run-uuid-1'

describe('workflowsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listByLenser delegates to repo and returns result', async () => {
    const workflows = [{ id: WORKFLOW_ID, title: 'My Workflow' }]
    mockRepo.listByLenser.mockResolvedValue(workflows)
    const result = await workflowsService.listByLenser('lenser-1')
    expect(mockRepo.listByLenser).toHaveBeenCalledWith('lenser-1', 100)
    expect(result).toEqual(workflows)
  })

  it('getById delegates to repo', async () => {
    mockRepo.getById.mockResolvedValue({ id: WORKFLOW_ID })
    const result = await workflowsService.getById(WORKFLOW_ID)
    expect(mockRepo.getById).toHaveBeenCalledWith(WORKFLOW_ID)
    expect(result).toEqual({ id: WORKFLOW_ID })
  })

  it('createWorkflow delegates to repo', async () => {
    const workflow = { id: WORKFLOW_ID }
    mockRepo.createWorkflow.mockResolvedValue(workflow)
    const result = await workflowsService.createWorkflow({ title: 'New' } as any)
    expect(mockRepo.createWorkflow).toHaveBeenCalledWith({ title: 'New' })
    expect(result).toEqual(workflow)
  })

  it('startRun passes all parameters to repo', async () => {
    const run = { id: RUN_ID }
    mockRepo.startRun.mockResolvedValue(run)
    const result = await workflowsService.startRun(WORKFLOW_ID, { x: 1 }, 'model-1', 'idem-key')
    expect(mockRepo.startRun).toHaveBeenCalledWith(WORKFLOW_ID, { x: 1 }, 'model-1', 'idem-key', undefined)
    expect(result).toEqual(run)
  })

  it('startRun forwards versionId when provided', async () => {
    const run = { id: RUN_ID, workflow_version_id: 'v-1' }
    mockRepo.startRun.mockResolvedValue(run)
    const result = await workflowsService.startRun(WORKFLOW_ID, {}, undefined, undefined, 'v-1')
    expect(mockRepo.startRun).toHaveBeenCalledWith(WORKFLOW_ID, {}, undefined, undefined, 'v-1')
    expect(result).toEqual(run)
  })

  it('propagates errors from repo without swallowing', async () => {
    mockRepo.getById.mockRejectedValue(new Error('workflow error'))
    await expect(workflowsService.getById(WORKFLOW_ID)).rejects.toThrow('workflow error')
  })

  it('listByLenserPaginated returns paginated envelope', async () => {
    const envelope = { data: [], meta: { total: 0 } }
    mockRepo.listByLenserPaginated.mockResolvedValue(envelope)
    const result = await workflowsService.listByLenserPaginated('lenser-1', 0, 20)
    expect(result).toEqual(envelope)
  })

  it('appendRunEvent delegates payload to repo', async () => {
    mockRepo.appendRunEvent.mockResolvedValue(null)
    await workflowsService.appendRunEvent(RUN_ID, 'step_started', { nodeId: 'n-1' })
    expect(mockRepo.appendRunEvent).toHaveBeenCalledWith(RUN_ID, 'step_started', { nodeId: 'n-1' })
  })

  it('upsertSchedule returns schedule from repo', async () => {
    const schedule = { id: 'sched-1' }
    mockRepo.upsertSchedule.mockResolvedValue(schedule)
    const result = await workflowsService.upsertSchedule({ workflow_id: WORKFLOW_ID } as any)
    expect(result).toEqual(schedule)
  })
})
