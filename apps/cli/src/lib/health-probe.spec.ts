import {
  getHealthProbeUrls,
  probeHealthUrls,
} from './health-probe'

describe('getHealthProbeUrls', () => {
  it('cloud mode uses only Supabase auth health', () => {
    expect(
      getHealthProbeUrls('cloud', {
        supabaseUrl: 'https://x.supabase.co',
        cloudApiUrl: 'https://x.supabase.co/functions/v1',
      }),
    ).toEqual(['https://x.supabase.co/auth/v1/health'])
  })

  it('local mode includes legacy platform API health when not Edge Functions', () => {
    expect(
      getHealthProbeUrls('local', {
        supabaseUrl: 'http://127.0.0.1:54321',
        cloudApiUrl: 'http://localhost:8786',
      }),
    ).toEqual([
      'http://127.0.0.1:54321/auth/v1/health',
      'http://localhost:8786/health',
    ])
  })

  it('local mode skips /health on Edge Functions base', () => {
    expect(
      getHealthProbeUrls('local', {
        supabaseUrl: 'http://127.0.0.1:54321',
        cloudApiUrl: 'http://127.0.0.1:54321/functions/v1',
      }),
    ).toEqual(['http://127.0.0.1:54321/auth/v1/health'])
  })
})

describe('probeHealthUrls', () => {
  it('sends apikey header for hosted Supabase health', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
    } as Response)

    await probeHealthUrls(['https://x.supabase.co/auth/v1/health'], {
      apikey: 'sb_publishable_test',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://x.supabase.co/auth/v1/health',
      expect.objectContaining({
        headers: { apikey: 'sb_publishable_test' },
      }),
    )

    fetchMock.mockRestore()
  })
})
