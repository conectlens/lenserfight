import { lensesService } from '@lenserfight/data/repositories'
import { VersionParamFields } from '@lenserfight/features/lenses'
import { Button } from '@lenserfight/ui/components'
import { useQueries } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import React, { useState, useMemo } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import type { LensVersionParam } from '@lenserfight/types'
import { buildEffectiveVersionParams } from '../utils/workflowTemplateParams'

interface WorkflowRootInputsPanelProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  onSubmit: (rootInputs: Record<string, string>) => void
  isRunning: boolean
  /** When false, the Execute button is disabled (funding/model not configured). */
  canExecute?: boolean
}

/**
 * Identifies root nodes (no incoming edges) and loads their typed version parameters
 * via the fn_get_version_params_with_tools RPC. Un-wired required params block execution.
 */
export function WorkflowRootInputsPanel({
  nodes,
  edges,
  onSubmit,
  isRunning,
  canExecute = true,
}: WorkflowRootInputsPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({})

  // Root nodes = nodes with no incoming edges
  const targetNodeIds = useMemo(() => new Set(edges.map((e) => e.target_node_id)), [edges])
  const rootNodes = useMemo(() => nodes.filter((n) => !targetNodeIds.has(n.id)), [nodes, targetNodeIds])

  // Load typed version params for each root node via getLatestPublishedVersion RPC
  const nodeVersionQueries = useQueries({
    queries: rootNodes.map((node) => ({
      queryKey: ['workflow-node-version', node.version_id ?? `head-${node.lens_id}`],
      queryFn: () =>
        node.version_id
          ? lensesService.getVersionById(node.version_id)
          : lensesService.getLatestPublishedVersion(node.lens_id).then((published) =>
              published ?? lensesService.getLatestVersion(node.lens_id)
            ),
      staleTime: 1000 * 60 * 5,
      enabled: !!node.lens_id,
    })),
  })

  const isLoading = nodeVersionQueries.some((q) => q.isLoading)

  // Build per-node param groups (filtered to un-wired params only)
  const paramGroups = useMemo(() => {
    return rootNodes
      .map((node, i) => {
        const version = nodeVersionQueries[i]?.data
        const incomingWired = new Set(
          edges
            .filter((e) => e.target_node_id === node.id)
            .map((e) => e.target_param_label.toLowerCase())
        )
        const params = buildEffectiveVersionParams(version).filter(
          (p) => !incomingWired.has(p.label.toLowerCase())
        )
        return {
          nodeId: node.id,
          nodeLabel: node.label ?? `Node ${node.ordinal + 1}`,
          params,
        }
      })
      .filter((g) => g.params.length > 0)
  }, [rootNodes, nodeVersionQueries, edges])

  // Required param validation
  const allRequiredFilled = useMemo(() => {
    for (const group of paramGroups) {
      for (const param of group.params) {
        // Params are required by default unless explicitly marked optional
        const isRequired = (param as LensVersionParam & { required?: boolean }).required !== false
        if (!isRequired) continue
        const key = `${group.nodeId}:${param.label}`
        const val = inputs[key]
        if (!val || val.trim() === '') return false
      }
    }
    return true
  }, [paramGroups, inputs])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  if (paramGroups.length === 0) {
    // No params required — show Execute button directly
    return (
      <div className="p-4">
        <Button
          type="button"
          size="sm"
          onClick={() => onSubmit({})}
          disabled={isRunning || !canExecute}
          className="w-full"
          title={!canExecute ? 'Select a funding source and model above' : undefined}
        >
          {isRunning ? 'Running…' : 'Execute Workflow'}
        </Button>
        {!canExecute && (
          <p className="mt-2 text-[10px] text-center text-greyscale-400">
            Select a funding source and model to run.
          </p>
        )}
      </div>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canExecute || !allRequiredFilled) return
    // Flatten inputs: strip nodeId prefix, deduplicate by param label
    const flatInputs: Record<string, string> = {}
    for (const [key, val] of Object.entries(inputs)) {
      const paramLabel = key.includes(':') ? key.split(':').slice(1).join(':') : key
      flatInputs[paramLabel] = val
    }
    onSubmit(flatInputs)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border-b border-surface-border">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-greyscale-400" />
        <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
          Workflow Inputs
        </p>
      </div>

      <div className="space-y-4">
        {paramGroups.map(({ nodeId, nodeLabel, params }) => (
          <div key={nodeId} className="space-y-2">
            {paramGroups.length > 1 && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-greyscale-400">
                {nodeLabel}
              </p>
            )}
            <VersionParamFields
              params={params}
              values={Object.fromEntries(
                Object.entries(inputs)
                  .filter(([k]) => k.startsWith(`${nodeId}:`))
                  .map(([k, v]) => [k.split(':').slice(1).join(':'), v])
              )}
              errors={{}}
              onChange={(name, value) =>
                setInputs((prev) => ({ ...prev, [`${nodeId}:${name}`]: String(value ?? '') }))
              }
              onImportJson={() => {}}
              onImportCsv={() => {}}
            />
          </div>
        ))}
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={isRunning || !canExecute || !allRequiredFilled}
        className="w-full"
        title={
          !canExecute
            ? 'Select a funding source and model above'
            : !allRequiredFilled
              ? 'Fill all required parameters'
              : undefined
        }
      >
        {isRunning ? 'Running…' : 'Execute Workflow'}
      </Button>

      {!canExecute && (
        <p className="text-[10px] text-center text-greyscale-400">
          Select a funding source and model to run.
        </p>
      )}
      {canExecute && !allRequiredFilled && (
        <p className="text-[10px] text-center text-amber-500">
          Fill all required parameters to continue.
        </p>
      )}
    </form>
  )
}
