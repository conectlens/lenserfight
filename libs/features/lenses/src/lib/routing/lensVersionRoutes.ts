import type { LensDetailViewModel, LensVersion } from '@lenserfight/types'

/** GitHub-style default branch — latest published (stable) lens version. */
export const LENS_VERSION_MAIN = 'main' as const

export type LensVersionRouteRef = typeof LENS_VERSION_MAIN | number

export type ParsedLensVersionRoute =
  | { kind: 'main' }
  | { kind: 'number'; versionNumber: number }

export function lensDetailPath(lensId: string, versionRef: LensVersionRouteRef = LENS_VERSION_MAIN): string {
  const segment = typeof versionRef === 'number' ? String(versionRef) : versionRef
  return `/lenses/${lensId}/${segment}`
}

/** Parse `:versionRef` route param (`main` or positive integer string). */
export function parseVersionRouteParam(raw: string | undefined): ParsedLensVersionRoute | null {
  if (!raw || raw === LENS_VERSION_MAIN) return { kind: 'main' }
  const n = Number.parseInt(raw, 10)
  if (Number.isFinite(n) && n > 0 && String(n) === raw) {
    return { kind: 'number', versionNumber: n }
  }
  return null
}

type VersionListItem = Pick<LensVersion, 'id' | 'versionNumber' | 'status'>

export function resolveVersionIdFromRoute(
  route: ParsedLensVersionRoute,
  ctx: {
    headVersionId?: string | null
    latestPublishedVersion?: LensDetailViewModel['latestPublishedVersion']
    versions?: VersionListItem[]
  }
): string | null {
  if (route.kind === 'main') {
    if (ctx.latestPublishedVersion?.id) return ctx.latestPublishedVersion.id
    if (ctx.headVersionId) return ctx.headVersionId
    const published = (ctx.versions ?? [])
      .filter((v) => v.status === 'published')
      .sort((a, b) => b.versionNumber - a.versionNumber)[0]
    if (published) return published.id
    const versions = ctx.versions ?? []
    if (versions.length === 0) return null
    return versions.reduce((best, v) => (v.versionNumber > best.versionNumber ? v : best)).id
  }

  return ctx.versions?.find((v) => v.versionNumber === route.versionNumber)?.id ?? null
}

export function versionNumberFromRoute(
  route: ParsedLensVersionRoute | null,
  activeVersion: LensVersion | null | undefined
): number | null {
  if (route?.kind === 'number') return route.versionNumber
  return activeVersion?.versionNumber ?? null
}
