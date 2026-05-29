jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))

jest.mock('../../lib/agent-workspace-context', () => ({
  getAgentWorkspaceContext: jest.fn(),
  resolveAgentIdentifier: jest.fn((id?: string) => id ?? 'workspace-id'),
  clearAgentWorkspaceContext: jest.fn(),
  setAgentWorkspaceContext: jest.fn(),
}))

jest.mock('../../lib/lenser-catalog', () => ({
  resolveAiLenserIdFromIdentifier: jest.fn(async (id: string) => `resolved-${id}`),
}))

jest.mock('../../lib/data-services', () => ({
  getActionLogs: jest.fn(),
  killAgentWorkers: jest.fn(),
}))

jest.mock('../../lib/safety', () => ({
  assertSafe: jest.fn(),
}))

jest.mock('../../utils/api', () => ({
  callRpc: jest.fn(),
  handleError: jest.fn(),
}))

jest.mock('../../utils/output', () => ({
  printJson: jest.fn(),
  printTable: jest.fn(),
  truncate: (s: string) => s,
}))

jest.mock('../../utils/ansi', () => ({
  A: new Proxy({}, { get: () => '' }),
  sym: { fight: '⚔' },
}))

jest.mock('./workspace-ops', () => ({
  printAgentWorkspaceOperations: jest.fn(),
  AGENT_WORKSPACE_OPERATIONS: [
    { category: 'Emergency', command: 'agents kill --confirm', description: 'Kill workers' },
    { category: 'Execute', command: 'agents dispatch', description: 'Dispatch' },
    { category: 'Team', command: 'agents team list', description: 'Teams' },
  ],
}))

import { getAgentWorkspaceContext } from '../../lib/agent-workspace-context'
import { killAgentWorkers } from '../../lib/data-services'
import { assertSafe } from '../../lib/safety'
import { resolveAiLenserIdFromIdentifier } from '../../lib/lenser-catalog'

const mockGetCtx = getAgentWorkspaceContext as jest.MockedFunction<typeof getAgentWorkspaceContext>
const mockKill = killAgentWorkers as jest.MockedFunction<typeof killAgentWorkers>
const mockAssertSafe = assertSafe as jest.MockedFunction<typeof assertSafe>
const mockResolve = resolveAiLenserIdFromIdentifier as jest.MockedFunction<
  typeof resolveAiLenserIdFromIdentifier
>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

beforeEach(() => {
  jest.clearAllMocks()
  mockAssertSafe.mockResolvedValue(undefined as never)
  mockGetCtx.mockReturnValue({
    aiLenserId: 'agent-uuid',
    handle: 'my-bot',
    displayName: 'My Bot',
    selectedAt: '2026-05-29T00:00:00Z',
  })
  mockKill.mockResolvedValue({
    killSwitchEnabled: true,
    agentPaused: true,
    cancelledRunIds: ['run-1'],
    cancelledCount: 1,
  })
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: cmd } = (await import('./index')) as { default: AnyCmd }
  const sub = cmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('agents kill', () => {
  it('requires --confirm via assertSafe and calls killAgentWorkers', async () => {
    const kill = await getSubCmd('kill')

    await kill.run?.({
      args: { confirm: true, json: true },
      cmd: {},
      rawArgs: [],
    })

    expect(mockAssertSafe).toHaveBeenCalledWith(
      expect.objectContaining({
        forceFlag: '--confirm',
        hasForce: true,
        risk: 'HIGH',
      }),
    )
    expect(mockResolve).toHaveBeenCalledWith('workspace-id')
    expect(mockKill).toHaveBeenCalledWith('resolved-workspace-id')
  })
})
