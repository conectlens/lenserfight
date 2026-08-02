// main.ts calls runMain(main) as a top-level side effect (real CLI
// execution against process.argv) — mock it so importing this spec never
// triggers that. See the comment on `export const main` in main.ts.
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
      gateway: {
        subCommands: {
          serve: {
            meta: { description: 'Daemon — denylisted' },
            run: async () => undefined,
          },
        },
      },
      runner: () => {
        throw new Error('should never be resolved — denylisted before resolve')
      },
    },
  },
}))

import { buildCliToolManifest, CLI_TOOL_DENYLIST } from './opencode-tool-bridge'

describe('buildCliToolManifest', () => {
  it('produces one entry per leaf command, including a parent that also has its own run()', async () => {
    const manifest = await buildCliToolManifest()
    const ids = manifest.map((e) => e.id).sort()
    expect(ids).toEqual(['lf_parent', 'lf_parent_child', 'lf_leaf'].sort())
  })

  it('excludes denylisted commands without resolving them', async () => {
    const manifest = await buildCliToolManifest()
    expect(manifest.some((e) => e.commandPath[0] === 'gateway')).toBe(false)
    expect(manifest.some((e) => e.commandPath[0] === 'runner')).toBe(false)
  })

  it('converts citty ArgDef shapes to the manifest arg-spec shape', async () => {
    const manifest = await buildCliToolManifest()
    const leaf = manifest.find((e) => e.id === 'lf_leaf')
    expect(leaf?.args).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'name', type: 'positional', required: true }),
        expect.objectContaining({ name: 'verbose', type: 'boolean' }),
        expect.objectContaining({ name: 'mode', type: 'enum', options: ['a', 'b'] }),
      ]),
    )
  })

  it('has gateway serve and the deprecated aliases in the denylist', () => {
    expect(CLI_TOOL_DENYLIST.has('gateway serve')).toBe(true)
    expect(CLI_TOOL_DENYLIST.has('runner')).toBe(true)
    expect(CLI_TOOL_DENYLIST.has('agent')).toBe(true)
    expect(CLI_TOOL_DENYLIST.has('assist')).toBe(true)
  })
})
