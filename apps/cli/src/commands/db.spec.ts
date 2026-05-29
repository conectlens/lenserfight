jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))

import dbCommand from './db'

describe('lf db group', () => {
  it('defines the db command group correctly', () => {
    const cmd = dbCommand as any
    expect(cmd.meta?.name).toBe('db')
    expect(cmd.subCommands?.dev).toBeDefined()
    expect(cmd.subCommands?.seed).toBeDefined()
    expect(cmd.subCommands?.reset).toBeDefined()
  })
})
