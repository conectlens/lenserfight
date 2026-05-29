jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn() },
}))
jest.mock('../../lib/data-services/executions', () => ({
  getMyExecutionActivityFeed: jest.fn(),
  getLensExecutionHistory: jest.fn(),
  listWorkflowRuns: jest.fn(),
}))
jest.mock('../../utils/api', () => ({ handleError: jest.fn() }))
jest.mock('../../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import {
  getLensExecutionHistory,
  getMyExecutionActivityFeed,
  listWorkflowRuns,
} from '../../lib/data-services/executions'
import { printJson, printTable } from '../../utils/output'
import historyCmd from './history'

const mockActivity = getMyExecutionActivityFeed as jest.MockedFunction<
  typeof getMyExecutionActivityFeed
>
const mockLensHistory = getLensExecutionHistory as jest.MockedFunction<
  typeof getLensExecutionHistory
>
const mockWorkflowRuns = listWorkflowRuns as jest.MockedFunction<typeof listWorkflowRuns>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void> }

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('execute history', () => {
  it('loads activity feed by default', async () => {
    mockActivity.mockResolvedValue([
      {
        occurred_at: '2026-05-29T00:00:00Z',
        kind: 'team_run',
        ai_lenser_id: 'a-1',
        ai_lenser_handle: 'bot',
        ai_lenser_name: 'Bot',
        title: 'Research run',
        status: 'completed',
        team_run_id: 'run-1',
        workflow_id: null,
        schedule_id: null,
        action_type: null,
        payload: {},
      },
    ])

    await (historyCmd as AnyCmd).run?.({ args: { lens: '', workflow: '', limit: '10', offset: '0', json: false } })

    expect(mockActivity).toHaveBeenCalledWith(10, 0)
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('loads lens execution history when --lens is set', async () => {
    mockLensHistory.mockResolvedValue([
      {
        requestId: 'req-1',
        lensId: 'lens-1',
        versionId: null,
        versionNumber: null,
        modelId: null,
        modelKey: 'gpt-4o',
        providerKey: 'openai',
        fundingSource: 'platform_credit',
        runId: 'run-1',
        runStatus: 'succeeded',
        latencyMs: 1200,
        tokenInput: 10,
        tokenOutput: 20,
        creditCost: 1,
        createdAt: '2026-05-29T00:00:00Z',
      },
    ])

    await (historyCmd as AnyCmd).run?.({
      args: { lens: 'lens-1', workflow: '', limit: '25', offset: '0', json: false },
    })

    expect(mockLensHistory).toHaveBeenCalledWith('lens-1', 25, 0)
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('loads workflow runs when --workflow is set', async () => {
    mockWorkflowRuns.mockResolvedValue([
      {
        id: 'run-1',
        workflow_id: 'wf-1',
        status: 'completed',
        trigger_mode: 'manual',
        started_at: '2026-05-29T00:00:00Z',
        completed_at: '2026-05-29T00:00:05Z',
        created_at: '2026-05-29T00:00:00Z',
      },
    ])

    await (historyCmd as AnyCmd).run?.({
      args: { lens: '', workflow: 'wf-1', limit: '25', offset: '0', json: true },
    })

    expect(mockWorkflowRuns).toHaveBeenCalledWith('wf-1', 25, 0)
    expect(mockPrintJson).toHaveBeenCalled()
  })

  it('rejects --lens and --workflow together', async () => {
    await (historyCmd as AnyCmd).run?.({
      args: { lens: 'lens-1', workflow: 'wf-1', limit: '25', offset: '0', json: false },
    })

    expect(process.exitCode).toBe(1)
    expect(mockActivity).not.toHaveBeenCalled()
    expect(mockLensHistory).not.toHaveBeenCalled()
    expect(mockWorkflowRuns).not.toHaveBeenCalled()
  })
})
