import { buildLfConfig, mergeLfConfig } from './lf-assist-config'

describe('buildLfConfig', () => {
  it('returns null when the project has no .mcp.json', () => {
    expect(buildLfConfig(null)).toBeNull()
  })

  it('includes mcp servers when present', () => {
    const mcp = { lf: { type: 'local', command: ['lf', 'mcp'] } }
    expect(buildLfConfig(mcp)).toEqual({ mcp })
  })
})

describe('mergeLfConfig', () => {
  it('preserves every key a foreign config already had', () => {
    const existing = {
      $schema: 'https://opencode.ai/config.json',
      model: 'anthropic/x',
      theme: 'dark',
    }
    const merged = mergeLfConfig(existing, null)
    expect(merged).toEqual(existing)
  })

  it('lets the user mcp entries win on key collision', () => {
    const existing = { mcp: { shared: { type: 'remote' }, mine: { type: 'local' } } }
    const merged = mergeLfConfig(existing, {
      shared: { type: 'local' },
      ours: { type: 'local' },
    })
    expect(merged.mcp).toEqual({
      ours: { type: 'local' },
      shared: { type: 'remote' },
      mine: { type: 'local' },
    })
  })

  it('adds mcp to a config that had none', () => {
    const mcp = { lf: { type: 'local' } }
    expect(mergeLfConfig({ theme: 'dark' }, mcp)).toEqual({ theme: 'dark', mcp })
  })

  it('leaves mcp absent when neither side defines any', () => {
    expect(mergeLfConfig({ theme: 'dark' }, null)).not.toHaveProperty('mcp')
  })
})
