import { lensesService } from '@lenserfight/data/repositories'
import { VersionParamFields } from '@lenserfight/features/lenses'
import { Button } from '@lenserfight/ui/components'
import { useQueries } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import React, { useEffect, useState, useMemo } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'
import type { LensVersionParam } from '@lenserfight/types'
import { buildEffectiveVersionParams } from '../utils/workflowTemplateParams'
import { CsvImportDialog } from '../../../../lenses/src/lib/components/CsvImportDialog'
import { JsonImportDialog } from '../../../../lenses/src/lib/components/JsonImportDialog'

interface WorkflowRootInputsPanelProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  onSubmit: (rootInputs: Record<string, string>) => void
  isRunning: boolean
  /** When false, the Execute button is disabled (funding/model not configured). */
  canExecute?: boolean
  /** Shown when Execute is disabled (e.g. Cloud BYOK unsupported in prod). */
  executeHint?: string | null
  /** Optional in-memory config overrides from the builder session. */
  nodeConfigOverrides?: Record<string, { param_overrides?: Record<string, string> }>
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
  executeHint,
  nodeConfigOverrides,
}: WorkflowRootInputsPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [activeImportNodeId, setActiveImportNodeId] = useState<string | null>(null)

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
          : lensesService.getLatestPublishedVersion(node.lens_id!).then((published) =>
              published ?? lensesService.getLatestVersion(node.lens_id!)
            ),
      staleTime: 1000 * 60 * 5,
      enabled: !!node.lens_id,
    })),
  })

  const isLoading = nodeVersionQueries.some((q) => q.isLoading)
  const versionDataSignature = nodeVersionQueries
    .map((q) => String((q.data as { id?: string } | undefined)?.id ?? 'none'))
    .join('|')

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
  }, [rootNodes, versionDataSignature, edges])

  useEffect(() => {
    if (paramGroups.length === 0) return

    setInputs((prev) => {
      const next = { ...prev }
      for (const group of paramGroups) {
        const node = nodes.find((n) => n.id === group.nodeId)
        const persisted = (node?.config?.['param_overrides'] as Record<string, unknown> | undefined) ?? {}
        const session = nodeConfigOverrides?.[group.nodeId]?.param_overrides ?? {}

        for (const param of group.params) {
          const key = `${group.nodeId}:${param.label}`
          if (next[key] && next[key].trim() !== '') continue

          const persistedValue = resolveOverrideValue(persisted, param.label)
          const sessionValue = resolveOverrideValue(session, param.label)
          const value = sessionValue ?? persistedValue
          if (typeof value === 'string' && value.trim() !== '') {
            next[key] = value
          }
        }
      }
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      const sameShape =
        prevKeys.length === nextKeys.length &&
        prevKeys.every((k) => prev[k] === next[k])
      return sameShape ? prev : next
    })
  }, [paramGroups, nodes, nodeConfigOverrides])

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

  const disabledReason = useMemo(() => {
    if (canExecute) return undefined
    const h = executeHint?.trim()
    return h && h.length > 0 ? h : 'Select a funding source and model above'
  }, [canExecute, executeHint])

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
          title={disabledReason}
        >
          {isRunning ? 'Running…' : 'Execute Workflow'}
        </Button>
        {!canExecute && (
          <p className="mt-2 text-[10px] text-center text-greyscale-400">
            {disabledReason}
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

  const activeImportGroup = activeImportNodeId
    ? paramGroups.find((group) => group.nodeId === activeImportNodeId) ?? null
    : null
  const activeImportValues = activeImportNodeId
    ? Object.fromEntries(
        Object.entries(inputs)
          .filter(([k]) => k.startsWith(`${activeImportNodeId}:`))
          .map(([k, v]) => [k.split(':').slice(1).join(':'), v]),
      )
    : {}
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
                setInputs((prev) => {
                  const key = `${nodeId}:${name}`
                  const nextVal = String(value ?? '')
                  return { ...prev, [key]: nextVal }
                })
              }
              onImportJson={() => {
                setActiveImportNodeId(nodeId)
                setJsonImportOpen(true)
              }}
              onImportCsv={() => {
                setActiveImportNodeId(nodeId)
                setCsvImportOpen(true)
              }}
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
            ? disabledReason
            : !allRequiredFilled
              ? 'Fill all required parameters'
              : undefined
        }
      >
        {isRunning ? 'Running…' : 'Execute Workflow'}
      </Button>

      {!canExecute && (
        <p className="text-[10px] text-center text-greyscale-400">{disabledReason}</p>
      )}
      {canExecute && !allRequiredFilled && (
        <p className="text-[10px] text-center text-amber-500">
          Fill all required parameters to continue.
        </p>
      )}

      <JsonImportDialog
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        versionParams={activeImportGroup?.params}
        onApply={(patch) => {
          if (!activeImportNodeId) return
          setInputs((prev) => {
            const next = { ...prev }
            for (const [key, value] of Object.entries(patch)) {
              next[`${activeImportNodeId}:${key}`] = String(value ?? '')
            }
            return next
          })
        }}
        currentValues={activeImportValues}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        versionParams={activeImportGroup?.params}
        onApply={(patch) => {
          if (!activeImportNodeId) return
          setInputs((prev) => {
            const next = { ...prev }
            for (const [key, value] of Object.entries(patch)) {
              next[`${activeImportNodeId}:${key}`] = String(value ?? '')
            }
            return next
          })
        }}
        currentValues={activeImportValues}
      />
    </form>
  )
}

function resolveOverrideValue(
  values: Record<string, unknown> | Record<string, string>,
  label: string,
): string | undefined {
  if (typeof values[label] === 'string') return values[label] as string
  const lower = label.toLowerCase()
  const match = Object.entries(values).find(([k, v]) => k.toLowerCase() === lower && typeof v === 'string')
  return match ? (match[1] as string) : undefined
}
