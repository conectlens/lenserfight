import { buildLfConfig, isLfOnlyConfig, isPluginEntry, mergeLfConfig } from './opencode-config'

const PLUGIN = '/usr/local/lib/node_modules/@lenserfight/cli/lf-plugin.js'

describe('isPluginEntry', () => {
  it('matches our bundle under both path separators', () => {
    expect(isPluginEntry(PLUGIN)).toBe(true)
    expect(
      isPluginEntry('C:\\Users\\x\\AppData\\Roaming\\npm\\node_modules\\@lenserfight\\cli\\lf-plugin.js'),
    ).toBe(true)
  })

  it('ignores unrelated plugins and non-strings', () => {
    expect(isPluginEntry('./my-plugin.js')).toBe(false)
    expect(isPluginEntry('lf-plugin.js.bak')).toBe(false)
    expect(isPluginEntry(undefined)).toBe(false)
    expect(isPluginEntry({ path: PLUGIN })).toBe(false)
  })
})

describe('isLfOnlyConfig', () => {
  it('recognises a config we wrote, even with a stale plugin path', () => {
    expect(isLfOnlyConfig(buildLfConfig(PLUGIN, null))).toBe(true)
    expect(isLfOnlyConfig(buildLfConfig(PLUGIN, { lf: { type: 'local' } }))).toBe(true)
    expect(isLfOnlyConfig({ plugin: ['/old/version/lf-plugin.js'] })).toBe(true)
  })

  it('treats hand-authored configs as foreign', () => {
    expect(isLfOnlyConfig({ plugin: ['./custom.js'], model: 'x' })).toBe(false)
    expect(isLfOnlyConfig({ theme: 'dark' })).toBe(false)
    expect(isLfOnlyConfig({ plugin: 'not-an-array' })).toBe(false)
    expect(isLfOnlyConfig({})).toBe(false)
  })

  it('keeps treating a config we merged into as foreign, so a re-run never wipes it', () => {
    // Regression: classifying on "references our plugin" made the second run
    // rewrite the file wholesale and drop the user's own settings.
    const merged = mergeLfConfig({ model: 'anthropic/x', plugin: ['./a.js'] }, PLUGIN, null)
    expect(isLfOnlyConfig(merged)).toBe(false)
    expect(mergeLfConfig(merged, PLUGIN, null)).toEqual(merged)
  })
})

describe('buildLfConfig', () => {
  it('omits mcp when the project has no .mcp.json', () => {
    expect(buildLfConfig(PLUGIN, null)).toEqual({
      $schema: 'https://opencode.ai/config.json',
      plugin: [PLUGIN],
    })
  })

  it('includes mcp servers when present', () => {
    const mcp = { lf: { type: 'local', command: ['lf', 'mcp'] } }
    expect(buildLfConfig(PLUGIN, mcp).mcp).toEqual(mcp)
  })
})

describe('mergeLfConfig', () => {
  it('preserves every key a foreign config already had', () => {
    const existing = {
      $schema: 'https://opencode.ai/config.json',
      model: 'anthropic/x',
      theme: 'dark',
    }
    const merged = mergeLfConfig(existing, PLUGIN, null)
    expect(merged.model).toBe('anthropic/x')
    expect(merged.theme).toBe('dark')
    expect(merged.plugin).toEqual([PLUGIN])
  })

  it('keeps the user plugins and appends ours exactly once', () => {
    const merged = mergeLfConfig({ plugin: ['./a.js', './b.js'] }, PLUGIN, null)
    expect(merged.plugin).toEqual(['./a.js', './b.js', PLUGIN])
  })

  it('replaces a stale lf plugin path rather than accumulating duplicates', () => {
    const merged = mergeLfConfig({ plugin: ['/old/lf-plugin.js', './a.js'] }, PLUGIN, null)
    expect(merged.plugin).toEqual(['./a.js', PLUGIN])
  })

  it('lets the user mcp entries win on key collision', () => {
    const existing = { mcp: { shared: { type: 'remote' }, mine: { type: 'local' } } }
    const merged = mergeLfConfig(existing, PLUGIN, {
      shared: { type: 'local' },
      ours: { type: 'local' },
    })
    expect(merged.mcp).toEqual({
      ours: { type: 'local' },
      shared: { type: 'remote' },
      mine: { type: 'local' },
    })
  })

  it('leaves mcp absent when neither side defines any', () => {
    expect(mergeLfConfig({ theme: 'dark' }, PLUGIN, null)).not.toHaveProperty('mcp')
  })
})
