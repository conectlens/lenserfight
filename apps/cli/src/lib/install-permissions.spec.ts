jest.mock('node:fs', () => ({
  accessSync: jest.fn(),
  constants: { W_OK: 2 },
  realpathSync: jest.fn(),
  statSync: jest.fn(),
}))

import { accessSync, realpathSync, statSync } from 'node:fs'

import {
  findInstallPermissionBlock,
  formatPermissionGuidance,
  installParentDirOf,
} from './install-permissions'

const mockAccess = accessSync as jest.MockedFunction<typeof accessSync>
const mockRealpath = realpathSync as unknown as jest.Mock
const mockStat = statSync as unknown as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockAccess.mockImplementation(() => undefined)
  mockRealpath.mockImplementation((p: string) => p)
  mockStat.mockReturnValue({ uid: 501 })
})

describe('installParentDirOf', () => {
  it('returns the scope directory for a scoped package', () => {
    expect(installParentDirOf('/opt/homebrew/lib/node_modules/@lenserfight/cli/main.js')).toBe(
      '/opt/homebrew/lib/node_modules/@lenserfight',
    )
  })

  it('returns node_modules itself for an unscoped package', () => {
    expect(installParentDirOf('/usr/local/lib/node_modules/somepkg/main.js')).toBe(
      '/usr/local/lib/node_modules',
    )
  })

  it('handles Windows paths', () => {
    expect(
      installParentDirOf('C:\\Users\\x\\AppData\\Roaming\\npm\\node_modules\\@lenserfight\\cli\\main.js'),
    ).toBe('C:\\Users\\x\\AppData\\Roaming\\npm\\node_modules\\@lenserfight')
  })

  it('returns null outside a node_modules tree, so the check is skipped', () => {
    expect(installParentDirOf('/Users/me/src/lenserfight/dist/apps/cli/main.js')).toBeNull()
    expect(installParentDirOf('/opt/homebrew/bin/lf')).toBeNull()
  })
})

describe('findInstallPermissionBlock', () => {
  const SHIM = '/opt/homebrew/bin/lf'
  const REAL = '/opt/homebrew/lib/node_modules/@lenserfight/cli/main.js'
  const SCOPE = '/opt/homebrew/lib/node_modules/@lenserfight'

  it('returns null when everything is writable', () => {
    mockRealpath.mockReturnValue(REAL)
    expect(findInstallPermissionBlock(SHIM)).toBeNull()
  })

  it('reports the package scope directory when it is not writable', () => {
    // The reported case: package owned by uid 501, running as uid 504.
    mockRealpath.mockReturnValue(REAL)
    mockAccess.mockImplementation((p) => {
      if (p === SCOPE) throw new Error('EACCES')
    })
    const spy = jest.spyOn(process, 'getuid' as never).mockReturnValue(504 as never)

    expect(findInstallPermissionBlock(SHIM)).toEqual({ dir: SCOPE, ownerUid: 501, currentUid: 504 })
    spy.mockRestore()
  })

  it('resolves the symlink rather than trusting argv[1]', () => {
    mockRealpath.mockReturnValue(REAL)
    mockAccess.mockImplementation((p) => {
      if (p === SCOPE) throw new Error('EACCES')
    })
    findInstallPermissionBlock(SHIM)
    expect(mockRealpath).toHaveBeenCalledWith(SHIM)
  })

  it('falls back to the bin directory when the package dir is fine but the shim dir is not', () => {
    mockRealpath.mockReturnValue(REAL)
    mockAccess.mockImplementation((p) => {
      if (p === '/opt/homebrew/bin') throw new Error('EACCES')
    })
    expect(findInstallPermissionBlock(SHIM)?.dir).toBe('/opt/homebrew/bin')
  })

  it('returns null for a source checkout, where the check does not apply', () => {
    const dev = '/Users/me/src/lenserfight/dist/apps/cli/main.js'
    mockRealpath.mockReturnValue(dev)
    mockAccess.mockImplementation(() => {
      throw new Error('EACCES')
    })
    expect(findInstallPermissionBlock(dev)).toBeNull()
  })

  it('never throws on an unresolvable entry path', () => {
    mockRealpath.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    expect(() => findInstallPermissionBlock('/gone/lf')).not.toThrow()
  })

  it('returns null when there is no entry path at all', () => {
    expect(findInstallPermissionBlock(undefined)).toBeNull()
  })

  it('still reports a block when the owner cannot be stat-ed', () => {
    mockRealpath.mockReturnValue(REAL)
    mockAccess.mockImplementation(() => {
      throw new Error('EACCES')
    })
    mockStat.mockImplementation(() => {
      throw new Error('EACCES')
    })
    expect(findInstallPermissionBlock(SHIM)).toMatchObject({ dir: SCOPE, ownerUid: null })
  })
})

describe('formatPermissionGuidance', () => {
  const block = { dir: '/opt/homebrew/lib/node_modules/@lenserfight', ownerUid: 501, currentUid: 504 }

  it('never offers a bare re-run of the install that just failed', () => {
    const out = formatPermissionGuidance(block, '@lenserfight/cli@latest')
    // `npm install -g <spec>` on its own fails identically under EACCES, so it
    // may only appear *after* the prefix switch that makes it work.
    expect(out).toContain('npm config set prefix ~/.npm-global')
    expect(out.indexOf('npm config set prefix')).toBeLessThan(out.indexOf('npm install -g'))
  })

  it('names the directory and both uids', () => {
    const out = formatPermissionGuidance(block, '@lenserfight/cli@latest')
    expect(out).toContain('/opt/homebrew/lib/node_modules/@lenserfight')
    expect(out).toContain('uid 501')
    expect(out).toContain('uid 504')
  })

  it('offers ownership transfer scoped to the blocked directory only', () => {
    const out = formatPermissionGuidance(block, '@lenserfight/cli@latest')
    expect(out).toContain('sudo chown -R "$(id -un)" "/opt/homebrew/lib/node_modules/@lenserfight"')
  })

  it('warns that plain sudo npm breaks a Homebrew prefix', () => {
    expect(formatPermissionGuidance(block, 'x')).toContain('root-owned files')
  })

  it('omits uid lines on platforms that do not report them', () => {
    const out = formatPermissionGuidance({ dir: 'C:\\npm\\node_modules', ownerUid: null, currentUid: null }, 'x')
    expect(out).not.toContain('uid')
    expect(out).toContain('C:\\npm\\node_modules')
  })
})
