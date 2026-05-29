jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))

describe('execute command tree', () => {
  it('registers workflow, battle, lens, team subcommands', async () => {
    const mod = await import('./index')
    const root = mod.default as { subCommands?: Record<string, unknown> }
    expect(root.subCommands?.['status']).toBeDefined()
    expect(root.subCommands?.['workflow']).toBeDefined()
    expect(root.subCommands?.['battle']).toBeDefined()
    expect(root.subCommands?.['lens']).toBeDefined()
    expect(root.subCommands?.['team']).toBeDefined()
    expect(root.subCommands?.['prompt']).toBeDefined()
  })

  it('workflow group includes stream', async () => {
    const mod = await import('./index')
    const workflow = (mod.default as { subCommands: { workflow: { subCommands: Record<string, unknown> } } })
      .subCommands.workflow
    expect(workflow.subCommands['stream']).toBeDefined()
    expect(workflow.subCommands['wait']).toBeDefined()
  })
})
