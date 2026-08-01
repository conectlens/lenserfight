/**
 * React binding for the workflow import service.
 *
 * The hook's only job is to assemble the service's dependencies from the real
 * repositories and to hold UI state. All import logic lives in
 * `workflow-import.service`, so this stays thin enough that a change to the
 * import rules never means editing a component.
 */
import { queryKeys } from '@lenserfight/data/cache'
import {
  artifactLifecycleRepository,
  lensesService,
  workflowsService,
} from '@lenserfight/data/repositories'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'

import {
  importWorkflow,
  previewWorkflowImport,
  type WorkflowImportOptions,
  type WorkflowImportPreview,
  type WorkflowImportResult,
} from './workflow-import.service'

import type { WorkflowDocumentFormat } from '@lenserfight/domain/workflow-protocol'

export interface UseWorkflowImportOptions {
  /** Current lenser id, used to scope lens reuse to lenses the user owns. */
  lenserId: string | undefined
}

export function useWorkflowImport({ lenserId }: UseWorkflowImportOptions) {
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<WorkflowImportPreview | null>(null)
  const [result, setResult] = useState<WorkflowImportResult | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  /**
   * Guards against a double submit racing past the `isImporting` state update.
   * A ref rather than state because it must be correct synchronously — two
   * clicks in the same tick would otherwise create two workflows.
   */
  const inFlight = useRef(false)

  const runPreview = useCallback((text: string, format?: WorkflowDocumentFormat) => {
    const next = previewWorkflowImport(text, format)
    setPreview(next)
    setResult(null)
    return next
  }, [])

  const reset = useCallback(() => {
    setPreview(null)
    setResult(null)
    inFlight.current = false
  }, [])

  const runImport = useCallback(
    async (
      text: string,
      options: WorkflowImportOptions = {},
      format?: WorkflowDocumentFormat,
    ): Promise<WorkflowImportResult | null> => {
      if (inFlight.current) return null
      inFlight.current = true
      setIsImporting(true)

      try {
        const tools = await lensesService.getTools().catch(() => [])
        const textToolId = tools.find((tool) => tool.key === 'text')?.id

        const imported = await importWorkflow(
          text,
          {
            /**
             * Parameter labels are deliberately not fetched here. Getting them
             * means one version query per candidate lens — an N+1 that would
             * cost 100 round-trips to *maybe* save one insert.
             *
             * The consequence is a conservative reuse policy: a definition that
             * declares parameters will not match a candidate, so it creates a
             * new lens. That errs toward duplication rather than toward binding
             * a workflow to a lens whose parameters do not fit, which is the
             * safer failure.
             */
            listOwnedLenses: async () => {
              if (!lenserId) return []
              const owned = await lensesService.getMyLenses(0, 100)
              return (owned.data ?? []).map((lens) => ({
                id: lens.id,
                title: lens.title,
              }))
            },
            createLens: (input) => lensesService.createLens(input),
            textToolId,
            createWorkflow: (input) => workflowsService.createWorkflow(input),
            upsertNodes: (workflowId, nodes) => workflowsService.upsertNodes(workflowId, nodes),
            upsertEdges: (workflowId, edges) => workflowsService.upsertEdges(workflowId, edges),
            upsertSchedule: (input) => workflowsService.upsertSchedule(input),
            deleteWorkflow: (workflowId) =>
              artifactLifecycleRepository.delete('workflow', workflowId),
            deleteLens: (lensId) => artifactLifecycleRepository.delete('lens', lensId),
          },
          options,
          format,
        )

        setResult(imported)

        if (imported.ok && imported.workflowId) {
          if (lenserId) {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.workflows.byLenser(lenserId),
            })
          }
          if (imported.lenses.some((entry) => entry.action === 'created')) {
            await queryClient.invalidateQueries({ queryKey: ['lens-list'] })
          }
        }

        return imported
      } finally {
        inFlight.current = false
        setIsImporting(false)
      }
    },
    [lenserId, queryClient],
  )

  return { preview, result, isImporting, runPreview, runImport, reset }
}
