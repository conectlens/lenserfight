// import.meta.url is invalid syntax under ts-jest's commonjs module target —
// mock the file that isolates it so ts-jest never transforms its real source.
jest.mock('./current-script-url', () => ({
  currentScriptUrl: require('node:url').pathToFileURL(__filename).href,
}))

// main.ts calls runMain(main) as a top-level side effect (real CLI execution
// against process.argv) — mock it so importing this spec never triggers
// that. See the comment on `export const main` in main.ts.
jest.mock('../main', () => ({
  main: {
    subCommands: {
      leaf: {
        meta: { description: 'A leaf command' },
        args: {
          name: { type: 'positional', required: true, description: 'positional name' },
          verbose: { type: 'boolean', description: 'verbose flag' },
          mode: { type: 'enum', options: ['a', 'b'], description: 'mode' },
        },
        run: async () => undefined,
      },
      parent: {
        meta: { description: 'A parent with its own run and subcommands' },
        run: async () => undefined,
        subCommands: {
          child: {
            meta: { description: 'Nested child' },
            args: {},
            run: async () => undefined,
          },
        },
      },
      runner: () => {
        throw new Error('should never be resolved — deprecated aliases warn as a side effect')
      },
      agent: () => {
        throw new Error('should never be resolved — deprecated aliases warn as a side effect')
      },
    },
  },
}))

jest.mock('node:fs', () => ({
  existsSync: (path: string) => path.endsWith('leaf.md'),
}))

import { buildCommandInventory, DEPRECATED_TOP_LEVEL } from './command-inventory'

describe('buildCommandInventory', () => {
  it('produces one entry per leaf command, including a parent that also has its own run()', async () => {
    const inventory = await buildCommandInventory()
    const names = inventory.map((e) => e.name).sort()
    expect(names).toEqual(['agent', 'parent', 'parent child', 'runner', 'leaf'].sort())
  })

  it('resolves a known nested command with the right path and description', async () => {
    const inventory = await buildCommandInventory()
    const child = inventory.find((e) => e.name === 'parent child')
    expect(child).toMatchObject({ path: ['parent', 'child'], description: 'Nested child', deprecated: false })
  })

  it('converts citty ArgDef shapes to the inventory arg-spec shape', async () => {
    const inventory = await buildCommandInventory()
    const leaf = inventory.find((e) => e.name === 'leaf')
    expect(leaf?.args).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'positional', required: true }),
        expect.objectContaining({ name: 'verbose', type: 'boolean' }),
        expect.objectContaining({ name: 'mode', type: 'enum', options: ['a', 'b'] }),
      ]),
    )
  })

  it('flags the deprecated top-level aliases without resolving them', async () => {
    const inventory = await buildCommandInventory()
    const runner = inventory.find((e) => e.name === 'runner')
    const agent = inventory.find((e) => e.name === 'agent')
    expect(runner).toMatchObject({ deprecated: true, path: ['runner'] })
    expect(agent).toMatchObject({ deprecated: true, path: ['agent'] })
    expect(DEPRECATED_TOP_LEVEL.has('runner')).toBe(true)
    expect(DEPRECATED_TOP_LEVEL.has('agent')).toBe(true)
  })

  it('reports hasDoc true only when a matching doc file exists', async () => {
    const inventory = await buildCommandInventory()
    expect(inventory.find((e) => e.name === 'leaf')?.hasDoc).toBe(true)
    expect(inventory.find((e) => e.name === 'parent')?.hasDoc).toBe(false)
  })
})
