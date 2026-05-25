import {
  lensDetailPath,
  parseVersionRouteParam,
  resolveVersionIdFromRoute,
} from './lensVersionRoutes'

describe('lensVersionRoutes', () => {
  it('builds main and numeric paths', () => {
    expect(lensDetailPath('abc', 'main')).toBe('/lenses/abc/main')
    expect(lensDetailPath('abc', 3)).toBe('/lenses/abc/3')
  })

  it('parses main and version numbers', () => {
    expect(parseVersionRouteParam(undefined)).toEqual({ kind: 'main' })
    expect(parseVersionRouteParam('main')).toEqual({ kind: 'main' })
    expect(parseVersionRouteParam('4')).toEqual({ kind: 'number', versionNumber: 4 })
    expect(parseVersionRouteParam('v4')).toBeNull()
  })

  it('resolves main to latest published then head', () => {
    const main = { kind: 'main' as const }
    expect(
      resolveVersionIdFromRoute(main, {
        latestPublishedVersion: { id: 'pub-1', versionNumber: 2 } as never,
        headVersionId: 'head-1',
      })
    ).toBe('pub-1')
    expect(
      resolveVersionIdFromRoute(main, {
        headVersionId: 'head-1',
        versions: [{ id: 'head-1', versionNumber: 3, status: 'draft' }],
      })
    ).toBe('head-1')
  })

  it('resolves numeric route by version number', () => {
    expect(
      resolveVersionIdFromRoute(
        { kind: 'number', versionNumber: 2 },
        {
          versions: [
            { id: 'a', versionNumber: 1, status: 'published' },
            { id: 'b', versionNumber: 2, status: 'draft' },
          ],
        }
      )
    ).toBe('b')
  })
})
