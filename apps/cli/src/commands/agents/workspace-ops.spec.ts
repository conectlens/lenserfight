jest.mock('../../utils/output', () => ({
  printTable: jest.fn(),
}))

jest.mock('../../utils/ansi', () => ({
  A: new Proxy({}, { get: () => '' }),
}))

import { AGENT_WORKSPACE_OPERATIONS } from './workspace-ops'

describe('AGENT_WORKSPACE_OPERATIONS', () => {
  it('includes emergency kill and core workspace commands', () => {
    const commands = AGENT_WORKSPACE_OPERATIONS.map((o) => o.command)
    expect(commands.some((c) => c.startsWith('agents kill'))).toBe(true)
    expect(commands.some((c) => c.startsWith('agents dispatch'))).toBe(true)
    expect(commands.some((c) => c.startsWith('agents team'))).toBe(true)
    expect(commands.some((c) => c.startsWith('agents schedule'))).toBe(true)
    expect(commands.some((c) => c.startsWith('agents memory'))).toBe(true)
  })
})
