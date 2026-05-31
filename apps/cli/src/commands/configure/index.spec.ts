jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))

describe('configure command tree', () => {
  it('registers keys, byok, providers, ollama, env, local-battle-key', async () => {
    const mod = await import('./index')
    const root = mod.default as { subCommands?: Record<string, unknown> }
    expect(root.subCommands?.['keys']).toBeDefined()
    expect(root.subCommands?.['byok']).toBeDefined()
    expect(root.subCommands?.['providers']).toBeDefined()
    expect(root.subCommands?.['ollama']).toBeDefined()
    expect(root.subCommands?.['env']).toBeDefined()
    expect(root.subCommands?.['local-battle-key']).toBeDefined()
  })
})
