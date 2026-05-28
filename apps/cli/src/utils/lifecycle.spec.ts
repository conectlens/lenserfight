jest.mock('./api', () => ({ callRpc: jest.fn() }))
jest.mock('./output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
}))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    info: jest.fn(),
  },
}))

import { callRpc } from './api'
import { printJson, printTable } from './output'
import { runLifecycleAction } from './lifecycle'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>

describe('CLI lifecycle helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCallRpc.mockResolvedValue({
      artifact_type: 'lens',
      artifact_id: 'lens-1',
      state: 'archived',
      visibility: 'private',
      pinned: false,
      archived_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      version_id: 'version-1',
      snapshot_hash: 'hash-1',
      dependency_summary: {
        total: 2,
        counts: { battles: 2 },
        blocking_reasons: ['2 battles'],
      },
    } as never)
  })

  it('routes status to fn_artifact_lifecycle_status', async () => {
    await runLifecycleAction('lens', 'lens-1', 'status', false)

    expect(mockCallRpc).toHaveBeenCalledWith('fn_artifact_lifecycle_status', {
      p_artifact_type: 'lens',
      p_artifact_id: 'lens-1',
    }, { requireAuth: true })
    expect(mockPrintTable).toHaveBeenCalled()
  })

  it('routes pin and unpin through fn_artifact_pin', async () => {
    await runLifecycleAction('workflow', 'workflow-1', 'pin', true)
    await runLifecycleAction('workflow', 'workflow-1', 'unpin', true)

    expect(mockCallRpc).toHaveBeenNthCalledWith(1, 'fn_artifact_pin', {
      p_artifact_type: 'workflow',
      p_artifact_id: 'workflow-1',
      p_pin: true,
    }, { requireAuth: true })
    expect(mockCallRpc).toHaveBeenNthCalledWith(2, 'fn_artifact_pin', {
      p_artifact_type: 'workflow',
      p_artifact_id: 'workflow-1',
      p_pin: false,
    }, { requireAuth: true })
    expect(mockPrintJson).toHaveBeenCalledTimes(2)
  })

  it('routes delete through dependency-aware fn_artifact_delete', async () => {
    await runLifecycleAction('battle', 'battle-1', 'delete', false)

    expect(mockCallRpc).toHaveBeenCalledWith('fn_artifact_delete', {
      p_artifact_type: 'battle',
      p_artifact_id: 'battle-1',
    }, { requireAuth: true })
  })
})
