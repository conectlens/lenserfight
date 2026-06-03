import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  LENS_VERSION_MAIN,
  lensDetailPath,
  parseVersionRouteParam,
  resolveVersionIdFromRoute,
  type LensVersionRouteRef,
  type ParsedLensVersionRoute,
} from '../routing/lensVersionRoutes'
import { useLensVersions, useLensVersionDetail } from './useLensVersions'
import type { LensDetailViewModel } from '@lenserfight/types'

export function useLensVersionRoute(
  lensId: string | undefined,
  lens: LensDetailViewModel | null | undefined
) {
  const { versionRef: versionRefParam } = useParams<{ id: string; versionRef?: string }>()
  const navigate = useNavigate()

  const parsed: ParsedLensVersionRoute | null = useMemo(
    () => parseVersionRouteParam(versionRefParam),
    [versionRefParam]
  )

  const needsVersionList = parsed?.kind === 'number'
  const { versions, isLoading: isLoadingVersions } = useLensVersions(lensId ?? '', {
    enabled: !!lensId && needsVersionList,
  })

  useEffect(() => {
    if (!lensId || versionRefParam === undefined) return
    if (parsed === null) {
      navigate(lensDetailPath(lensId, LENS_VERSION_MAIN), { replace: true })
    }
  }, [lensId, versionRefParam, parsed, navigate])

  const resolvedVersionId = useMemo(() => {
    if (!lensId || !parsed) return null
    return resolveVersionIdFromRoute(parsed, {
      headVersionId: lens?.headVersionId ?? null,
      latestPublishedVersion: lens?.latestPublishedVersion ?? null,
      versions,
    })
  }, [lensId, parsed, lens?.headVersionId, lens?.latestPublishedVersion, versions])

  useEffect(() => {
    if (!lensId || !parsed || parsed.kind !== 'number') return
    if (isLoadingVersions) return
    if (resolvedVersionId) return
    navigate(lensDetailPath(lensId, LENS_VERSION_MAIN), { replace: true })
  }, [lensId, parsed, isLoadingVersions, resolvedVersionId, navigate])

  const { data: activeVersion, isLoading: isLoadingActiveVersion } = useLensVersionDetail(
    resolvedVersionId,
    { enabled: !!resolvedVersionId, staleTime: 120_000 }
  )

  const navigateToVersion = (ref: LensVersionRouteRef) => {
    if (lensId) navigate(lensDetailPath(lensId, ref))
  }

  const isVersionReady = !!activeVersion && (activeVersion.parameters == null || Array.isArray(activeVersion.parameters))
  const isResolvingVersion =
    !!resolvedVersionId && (isLoadingActiveVersion || !isVersionReady)

  return {
    parsed,
    resolvedVersionId,
    activeVersion: activeVersion ?? null,
    isResolvingVersion,
    isLoadingVersions: needsVersionList && isLoadingVersions,
    versions,
    navigateToVersion,
    isMainRoute: parsed?.kind === 'main',
    routeVersionNumber: parsed?.kind === 'number' ? parsed.versionNumber : null,
  }
}
