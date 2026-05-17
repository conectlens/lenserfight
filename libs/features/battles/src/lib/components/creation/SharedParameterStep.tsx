/**
 * SharedParameterStep — Lens Battle parameter fairness step.
 *
 * Collects shared [[parameter]] values for a Lens Battle. Every contender
 * receives these identical inputs, ensuring a fair comparison. This step
 * appears only when the battle format is 'lens' and the selected lens has
 * at least one parameter.
 */

import { lensesService } from '@lenserfight/data/repositories'
import { VersionParamFields } from '@lenserfight/features/lenses'
import type { LensVersionParam } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import React from 'react'

export interface SharedParameterStepProps {
  /** ID of the selected lens. */
  lensId: string | null
  /** Pinned version ID if the user picked one; null → use head/published. */
  versionId?: string | null
  /** Current shared parameter values keyed by parameter label. */
  values: Record<string, unknown>
  /** Called when any parameter value changes. */
  onChange: (values: Record<string, unknown>) => void
}

export const SharedParameterStep: React.FC<SharedParameterStepProps> = ({
  lensId,
  versionId,
  values,
  onChange,
}) => {
  // Fetch lens versions to resolve the effective version
  const { data: versions = [] } = useQuery({
    queryKey: ['shared-param-lens-versions', lensId],
    queryFn: () => lensesService.getVersions(lensId!),
    enabled: !!lensId,
    staleTime: 60_000,
  })

  const resolvedVersionId =
    versionId ??
    versions.find((v) => v.status === 'published')?.id ??
    versions[0]?.id ??
    null

  // Fetch version detail with parameters
  const { data: versionDetail, isLoading } = useQuery({
    queryKey: ['shared-param-version-detail', resolvedVersionId],
    queryFn: () => lensesService.getVersionById(resolvedVersionId!),
    enabled: !!resolvedVersionId && !!lensId,
    staleTime: 120_000,
  })

  const params: LensVersionParam[] = (versionDetail?.parameters ?? []) as LensVersionParam[]
  const requiredParams = params.filter((p) => p.tool?.required)
  const filledRequired = requiredParams.every((p) => {
    const v = values[p.label]
    return v !== undefined && v !== null && v !== ''
  })

  const handleParamChange = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value })
  }

  // ── No lens selected ────────────────────────────────────────────────────
  if (!lensId) {
    return (
      <div className="py-8 text-center text-sm text-greyscale-400">
        Select a lens in the previous step to configure shared inputs.
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  // ── No parameters ───────────────────────────────────────────────────────
  if (params.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-6 text-center">
        <CheckCircle2 size={24} className="mx-auto mb-2 text-status-green" />
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
          No parameters required
        </p>
        <p className="mt-1 text-xs text-greyscale-400">
          This lens has no input parameters. All contenders will receive the same prompt as-is.
        </p>
      </div>
    )
  }

  // ── Parameter form ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Fairness notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-primary-yellow-600" />
        <div className="text-sm text-greyscale-700 dark:text-greyscale-200">
          <p className="font-semibold">Shared inputs for fairness</p>
          <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
            These values are shared with every contender. Each AI model or participant
            receives the same resolved prompt to ensure a fair comparison.
          </p>
        </div>
      </div>

      {/* Parameter fields */}
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-4 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
            Lens Parameters
          </p>
          {requiredParams.length > 0 && (
            <p className="text-xs text-greyscale-500 mt-0.5">
              Fill required fields (<span className="text-status-red">*</span>) before proceeding.
            </p>
          )}
        </div>
        <VersionParamFields
          params={params}
          values={values}
          errors={{}}
          onChange={handleParamChange}
        />
      </div>

      {/* Status indicator */}
      {requiredParams.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          {filledRequired ? (
            <>
              <CheckCircle2 size={14} className="text-status-green" />
              <span className="text-greyscale-600 dark:text-greyscale-300">
                All required parameters filled
              </span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} className="text-primary-yellow-500" />
              <span className="text-greyscale-500">
                {requiredParams.filter((p) => {
                  const v = values[p.label]
                  return v === undefined || v === null || v === ''
                }).length}{' '}
                required parameter{requiredParams.length !== 1 ? 's' : ''} remaining
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
