jest.mock('node:child_process', () => ({
  execSync: jest.fn(),
}))
jest.mock('../../config/project-config', () => ({
  resolveConfig: jest.fn(),
}))

import { execSync } from 'node:child_process'
import { detectNode, detectDocker, detectSupabaseCli, detectCloudApi, checkCommand } from './detect'

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('detectNode', () => {
  it('returns ok when Node version is >= 20', () => {
    const original = process.version
    Object.defineProperty(process, 'version', { value: 'v22.4.0', writable: true })

    const result = detectNode()

    expect(result.ok).toBe(true)
    expect(result.detail).toBe('v22.4.0')

    Object.defineProperty(process, 'version', { value: original, writable: true })
  })

  it('returns fail when Node version is < 20', () => {
    const original = process.version
    Object.defineProperty(process, 'version', { value: 'v16.20.0', writable: true })

    const result = detectNode()

    expect(result.ok).toBe(false)
    expect(result.detail).toContain('requires >= 20')

    Object.defineProperty(process, 'version', { value: original, writable: true })
  })
})

describe('detectDocker', () => {
  it('returns ok when docker is found and running', () => {
    mockExecSync.mockReturnValueOnce('/usr/bin/docker' as unknown as Buffer) // which docker
    mockExecSync.mockReturnValueOnce('' as unknown as Buffer) // docker info

    const result = detectDocker()

    expect(result.ok).toBe(true)
    expect(result.detail).toBe('running')
  })

  it('returns fail when docker is not found', () => {
    mockExecSync.mockImplementationOnce(() => { throw new Error('not found') })

    const result = detectDocker()

    expect(result.ok).toBe(false)
    expect(result.detail).toContain('not found')
  })
})

describe('detectSupabaseCli', () => {
  it('returns ok when supabase CLI is found', () => {
    mockExecSync.mockReturnValueOnce('/usr/local/bin/supabase' as unknown as Buffer) // which supabase
    mockExecSync.mockReturnValueOnce('1.120.0\n' as unknown as Buffer) // supabase --version

    const result = detectSupabaseCli()

    expect(result.ok).toBe(true)
    expect(result.detail).toContain('1.120.0')
  })
})

describe('detectCloudApi', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns fail when fetch throws', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const result = await detectCloudApi('https://unreachable.example.com')

    expect(result.ok).toBe(false)
    expect(result.detail).toContain('Cannot reach')
  })
})
