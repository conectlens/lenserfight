/**
 * WorkflowInputStep — Workflow Battle shared-input fairness step.
 *
 * Collects shared context_inputs for a Workflow Battle. These are the
 * external trigger values passed to every contender's workflow run,
 * ensuring both AI models start from identical initial conditions.
 *
 * The step resolves the workflow's root nodes (those with no incoming edges),
 * then surfaces their lens parameters as the configurable shared inputs.
 * If the workflow has no root-node lens params, a confirmation card confirms
 * that all contenders start from an identical internal state.
 */

import { lensesService, workflowsService } from '@lenserfight/data/repositories'
import { VersionParamFields } from '@lenserfight/features/lenses'
import type { LensVersionParam } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, GitBranch, Info } from 'lucide-react'
import React from 'react'

export interface WorkflowInputStepProps {
  /** ID of the selected workflow. */
  workflowId: string | null
  /** Current shared input values. */
  values: Record<string, unknown>
  /** Called when any input value changes. */
  onChange: (values: Record<string, unknown>) => void
}

export const WorkflowInputStep: React.FC<WorkflowInputStepProps> = ({
  workflowId,
  values,
  onChange,
}) => {
  // Fetch bootstrap to resolve nodes + edges
  const { data: bootstrap, isLoading: isLoadingBootstrap } = useQuery({
    queryKey: ['workflow-input-step-bootstrap', workflowId],
    queryFn: () => workflowsService.getBootstrap(workflowId!),
    enabled: !!workflowId,
    staleTime: 60_000,
  })

  // Identify root nodes: nodes that appear in no edge's target_node_id
  const rootNodes = React.useMemo(() => {
    if (!bootstrap) return []
    const targetIds = new Set(bootstrap.edges.map((e) => e.target_node_id))
    return bootstrap.nodes.filter((n) => !targetIds.has(n.id) && !!n.lens_id)
  }, [bootstrap])

  // Take the first root node's lens_id as the trigger lens
  const triggerLensId = rootNodes[0]?.lens_id ?? null
  const triggerVersionId = rootNodes[0]?.version_id ?? null

  // Fetch versions for the trigger lens
  const { data: versions = [] } = useQuery({
    queryKey: ['workflow-input-step-versions', triggerLensId],
    queryFn: () => lensesService.getVersions(triggerLensId!),
    enabled: !!triggerLensId,
    staleTime: 60_000,
  })

  const resolvedVersionId =
    triggerVersionId ??
    versions.find((v) => v.status === 'published')?.id ??
    versions[0]?.id ??
    null

  const { data: versionDetail, isLoading: isLoadingVersion } = useQuery({
    queryKey: ['workflow-input-step-version-detail', resolvedVersionId],
    queryFn: () => lensesService.getVersionById(resolvedVersionId!),
    enabled: !!resolvedVersionId && !!triggerLensId,
    staleTime: 120_000,
  })

  const isLoading = isLoadingBootstrap || (!!triggerLensId && isLoadingVersion)
  const params: LensVersionParam[] = (versionDetail?.parameters ?? []) as LensVersionParam[]
  const requiredParams = params.filter((p) => p.tool?.required)
  const filledRequired = requiredParams.every((p) => {
    const v = values[p.label]
    return v !== undefined && v !== null && v !== ''
  })

  const handleParamChange = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value })
  }

  // ── No workflow selected ──────────────────────────────────────────────────
  if (!workflowId) {
    return (
      <div className="py-8 text-center text-sm text-greyscale-400">
        Select a workflow in the previous step to configure shared inputs.
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  // ── No trigger lens params — workflow is self-contained ───────────────────
  if (!triggerLensId || params.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-surface-border bg-surface-raised p-6 text-center">
          <CheckCircle2 size={24} className="mx-auto mb-2 text-status-green" />
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
            No shared inputs required
          </p>
          <p className="mt-1 text-xs text-greyscale-400">
            This workflow has no external trigger inputs. Both AI contenders will
            execute the same pipeline from identical initial state.
          </p>
        </div>
        {/* Workflow identity */}
        {bootstrap?.workflow && (
          <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
            <div className="flex-shrink-0 rounded-lg bg-primary-yellow-500/10 p-1.5">
              <GitBranch size={15} className="text-primary-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                {bootstrap.workflow.title}
              </p>
              <p className="text-xs text-greyscale-400">
                {bootstrap.nodes.length} node{bootstrap.nodes.length !== 1 ? 's' : ''}
                {bootstrap.workflow.output_modalities?.length
                  ? ` · outputs: ${bootstrap.workflow.output_modalities.join(', ')}`
                  : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Parameter form ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Fairness notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary-yellow-500/20 bg-primary-yellow-500/5 px-4 py-3">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-primary-yellow-600" />
        <div className="text-sm text-greyscale-700 dark:text-greyscale-200">
          <p className="font-semibold">Shared workflow inputs for fairness</p>
          <p className="mt-0.5 text-xs text-greyscale-500 dark:text-greyscale-400">
            These values are the trigger inputs for the workflow's entry node.
            Every AI contender receives the same initial context — ensuring a
            deterministic, fair comparison across models.
          </p>
        </div>
      </div>

      {/* Workflow identity */}
      {bootstrap?.workflow && (
        <div className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
          <div className="flex-shrink-0 rounded-lg bg-primary-yellow-500/10 p-1.5">
            <GitBranch size={15} className="text-primary-yellow-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
              {bootstrap.workflow.title}
            </p>
            <p className="text-xs text-greyscale-400">
              {bootstrap.nodes.length} node{bootstrap.nodes.length !== 1 ? 's' : ''}
              {bootstrap.workflow.output_modalities?.length
                ? ` · outputs: ${bootstrap.workflow.output_modalities.join(', ')}`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Parameter fields */}
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-4 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
            Trigger Inputs
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
                All required inputs filled
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
                required input{requiredParams.length !== 1 ? 's' : ''} remaining
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
