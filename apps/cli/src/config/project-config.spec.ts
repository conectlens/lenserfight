import {
  getEffectiveMode,
  isDevOnlyAuthBaseUrl,
  isLocalSupabaseAnonKey,
  resolveAuthBaseUrl,
  resolveCloudApiUrl,
  resolveConfig,
  resolveSupabaseAnonKey,
  resolveSupabaseUrl,
  PRODUCTION_AUTH_BASE_URL,
  PRODUCTION_SUPABASE_ANON_KEY,
  PRODUCTION_SUPABASE_URL,
  supabaseEdgeFunctionsBaseUrl,
} from './project-config'

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
    delete process.env['SUPABASE_URL']
    delete process.env['SUPABASE_ANON_KEY']
    delete process.env['SUPABASE_PUBLISHABLE_KEY']
    delete process.env['API_URL']
    delete process.env['LENSERFIGHT_CLOUD_API_URL']
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

  it('getEffectiveMode prefers LF_LOCAL over LF_CLOUD', () => {
    process.env['LF_LOCAL'] = '1'
    process.env['LF_CLOUD'] = '1'
    expect(getEffectiveMode().mode).toBe('local')
    expect(getEffectiveMode().source).toBe('env-local')
  })

  it('getEffectiveMode defaults to cloud', () => {
    expect(getEffectiveMode()).toEqual({ mode: 'cloud', source: 'default' })
  })

  it('detects Tailscale CGNAT auth URLs as dev-only', () => {
    expect(isDevOnlyAuthBaseUrl('http://100.88.58.68:3004')).toBe(true)
    expect(isDevOnlyAuthBaseUrl('https://auth.lenserfight.com')).toBe(false)
  })

  it('resolveAuthBaseUrl uses production for cloud when env has Tailscale', () => {
    expect(resolveAuthBaseUrl('cloud', 'http://100.88.58.68:3004')).toBe(PRODUCTION_AUTH_BASE_URL)
  })

  it('resolveAuthBaseUrl keeps dev URL for supabase local mode', () => {
    const url = 'http://100.88.58.68:3004'
    expect(resolveAuthBaseUrl('local', url)).toBe(url)
  })

  it('supabaseEdgeFunctionsBaseUrl appends /functions/v1 once', () => {
    expect(supabaseEdgeFunctionsBaseUrl('https://x.supabase.co')).toBe(
      'https://x.supabase.co/functions/v1',
    )
    expect(supabaseEdgeFunctionsBaseUrl('https://x.supabase.co/functions/v1')).toBe(
      'https://x.supabase.co/functions/v1',
    )
  })

  it('resolveCloudApiUrl prefers explicit API_URL in local mode', () => {
    expect(resolveCloudApiUrl('local', 'https://x.supabase.co', 'http://localhost:8786')).toBe(
      'http://localhost:8786',
    )
  })

  it('resolveCloudApiUrl ignores dev API_URL in cloud mode', () => {
    expect(
      resolveCloudApiUrl('cloud', 'https://x.supabase.co', 'http://127.0.0.1:54321/rest/v1'),
    ).toBe('https://x.supabase.co/functions/v1')
  })

  it('resolveSupabaseUrl skips dev env URL in cloud mode', () => {
    expect(
      resolveSupabaseUrl('cloud', 'http://127.0.0.1:54321', 'https://prod.supabase.co'),
    ).toBe('https://prod.supabase.co')
  })

  it('resolveSupabaseAnonKey uses production key when env is bound to dev URL', () => {
    expect(
      resolveSupabaseAnonKey(
        'cloud',
        'sb_publishable_local_dev',
        undefined,
        'http://127.0.0.1:54321',
      ),
    ).toBe(PRODUCTION_SUPABASE_ANON_KEY)
    expect(isLocalSupabaseAnonKey(resolveSupabaseAnonKey('local'))).toBe(true)
  })

  it('cloud mode defaults to official production Supabase when env is local-only', () => {
    process.env['LF_CLOUD'] = '1'
    process.env['SUPABASE_URL'] = 'http://127.0.0.1:54321'
    process.env['SUPABASE_PUBLISHABLE_KEY'] = 'sb_publishable_local'
    const config = resolveConfig()
    expect(config.supabaseUrl).toBe(PRODUCTION_SUPABASE_URL)
    expect(config.supabaseAnonKey).toBe(PRODUCTION_SUPABASE_ANON_KEY)
    expect(config.cloudApiUrl).toBe(`${PRODUCTION_SUPABASE_URL}/functions/v1`)
  })

  it('defaults local cloudApiUrl to Supabase Edge Functions', () => {
    process.env['LF_LOCAL'] = '1'
    expect(resolveConfig().cloudApiUrl).toBe('http://127.0.0.1:54321/functions/v1')
  })

  it('derives cloud cloudApiUrl from hosted SUPABASE_URL', () => {
    process.env['LF_CLOUD'] = '1'
    process.env['SUPABASE_URL'] = 'https://myproj.supabase.co'
    process.env['SUPABASE_ANON_KEY'] = 'cloud-anon-jwt'
    expect(resolveConfig().cloudApiUrl).toBe('https://myproj.supabase.co/functions/v1')
    expect(resolveConfig().supabaseUrl).toBe('https://myproj.supabase.co')
  })

})
