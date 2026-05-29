import { resolveConfig } from './project-config'

jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn().mockReturnValue(''),
}))

describe('project-config defaults and overrides', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env['LF_LOCAL']
    delete process.env['LF_CLOUD']
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('defaults to cloud mode when no configuration exists', () => {
    const config = resolveConfig()
    expect(config.mode).toBe('cloud')
  })

  it('supports --local override via process.env.LF_LOCAL', () => {
    process.env['LF_LOCAL'] = '1'
    const config = resolveConfig()
    expect(config.mode).toBe('local')
  })

  it('supports --cloud override via process.env.LF_CLOUD', () => {
    process.env['LF_CLOUD'] = '1'
    const config = resolveConfig()
    expect(config.mode).toBe('cloud')
  })
})
