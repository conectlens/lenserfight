import {
  buildAuthAppUrl,
  clearDeveloperToken,
  isDeveloperTokenActive,
  saveDeveloperToken,
} from './auth';

const mockLoadUserConfig = jest.fn()
const mockSaveUserConfig = jest.fn()
const mockResolveConfig = jest.fn()
const mockLoadEnvConfig = jest.fn()

jest.mock('../config/project-config', () => ({
  ...jest.requireActual<typeof import('../config/project-config')>(
    '../config/project-config',
  ),
  loadUserConfig: () => mockLoadUserConfig(),
  saveUserConfig: (partial: Record<string, unknown>) => mockSaveUserConfig(partial),
  resolveConfig: () => mockResolveConfig(),
  loadEnvConfig: () => mockLoadEnvConfig(),
}))

describe('developer token CLI helpers', () => {
  beforeEach(() => {
    mockLoadUserConfig.mockReset();
    mockSaveUserConfig.mockReset();
    mockResolveConfig.mockReset();
    mockLoadEnvConfig.mockReset();
    mockLoadEnvConfig.mockReturnValue({});
    mockResolveConfig.mockReturnValue({
      mode: 'local',
      supabaseUrl: 'http://127.0.0.1:54321',
      cloudApiUrl: 'http://localhost:8786',
      supabaseAnonKey: 'anon',
      dbPort: 54322,
      apiPort: 54321,
    });
  });

  it('persists a developer token in the user config', () => {
    saveDeveloperToken({
      tokenId: 'tok-1',
      token: 'dev-token',
      label: 'CLI',
      tokenPrefix: 'deadbeef',
      expiresAt: '2026-03-28T01:00:00Z',
      createdAt: '2026-03-28T00:00:00Z',
    });

    expect(mockSaveUserConfig).toHaveBeenCalledWith({
      developerTokenId: 'tok-1',
      developerToken: 'dev-token',
      developerTokenExpiresAt: '2026-03-28T01:00:00Z',
    });
  });

  it('clears the stored developer token', () => {
    clearDeveloperToken();

    expect(mockSaveUserConfig).toHaveBeenCalledWith({
      developerTokenId: undefined,
      developerToken: undefined,
      developerTokenExpiresAt: undefined,
    });
  });

  it('treats expired developer tokens as inactive', () => {
    mockLoadUserConfig.mockReturnValue({
      developerToken: 'dev-token',
      developerTokenExpiresAt: '2020-01-01T00:00:00Z',
    });

    expect(isDeveloperTokenActive()).toBe(false);
  });

  it('builds auth app URLs using the default base when authBaseUrl is not set', () => {
    expect(buildAuthAppUrl('/device-approval?code=ABCD-EFGH')).toBe(
      'https://auth.lenserfight.com/device-approval?code=ABCD-EFGH'
    );
  });

  it('builds auth app URLs using AUTH_BASE_URL when set', () => {
    mockResolveConfig.mockReturnValue({
      mode: 'local',
      supabaseUrl: 'http://127.0.0.1:54321',
      cloudApiUrl: 'http://localhost:8786',
      supabaseAnonKey: 'anon',
      dbPort: 54322,
      apiPort: 54321,
      authBaseUrl: 'http://localhost:5173',
    });
    expect(buildAuthAppUrl('/device-approval?code=ABCD-EFGH')).toBe(
      'http://localhost:5173/device-approval?code=ABCD-EFGH'
    );
  });

  it('uses production auth URL in cloud mode even when resolveConfig strips dev env', () => {
    mockResolveConfig.mockReturnValue({
      mode: 'cloud',
      supabaseUrl: 'https://x.supabase.co',
      cloudApiUrl: 'https://x.supabase.co/functions/v1',
      supabaseAnonKey: 'anon',
      dbPort: 54322,
      apiPort: 54321,
      authBaseUrl: 'https://auth.lenserfight.com',
    });
    expect(buildAuthAppUrl('/device-approval?code=ABCD-EFGH')).toBe(
      'https://auth.lenserfight.com/device-approval?code=ABCD-EFGH'
    );
  });
});
