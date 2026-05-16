import { lensesService } from '@lenserfight/data/repositories'
import { useAIModels } from '@lenserfight/features/generations'
import { FundingSourceToggle, LensBodyViewer, useFundingSource, VersionParamFields } from '@lenserfight/features/lenses'
import { useChainabitConnection } from '@lenserfight/features/store'
import { Button } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Pencil, X } from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'

import type { WorkflowNodeConfig } from './WorkflowCanvasNode'
import type { WorkflowEdgeRecord, WorkflowNodeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'
import type { AIProvider, AIProviderModel } from '@lenserfight/types'
import { buildEffectiveVersionParams } from '../utils/workflowTemplateParams'
import { CsvImportDialog } from '../../../../lenses/src/lib/components/CsvImportDialog'
import { JsonImportDialog } from '../../../../lenses/src/lib/components/JsonImportDialog'
import { WorkflowUpstreamOutputPanel } from './upstream/WorkflowUpstreamOutputPanel'
import { useUpstreamNodeOutputs } from '../hooks/useUpstreamNodeOutputs'

interface WorkflowNodeConfigPanelProps {
  nodeId: string
  lensId: string
  versionId: string | null | undefined
  nodeLabel: string
  currentUserId?: string
  currentConfig: WorkflowNodeConfig
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  /** Latest execution results for upstream output inspection panel */
  nodeResults?: WorkflowNodeResultRecord[]
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
  onEditLens?: (lensId: string) => void
}

export function WorkflowNodeConfigPanel({
  nodeId,
  lensId,
  versionId,
  nodeLabel,
  currentUserId,
  currentConfig,
  nodes,
  edges,
  nodeResults = [],
  onSave,
  onClose,
  onEditLens,
}: WorkflowNodeConfigPanelProps) {
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState(
    currentConfig.model_id ??
    (typeof window !== 'undefined' ? (localStorage.getItem('lf-workflow-global-model') ?? '') : '')
  )
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>(
    currentConfig.param_overrides ?? {}
  )
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  const { models, isLoading: modelsLoading } = useAIModels()
  const nodeFunding = useFundingSource(selectedProviderKey)
  const chainabit = useChainabitConnection()

  // Load lens version: use explicit versionId, fall back to latest published, then any draft
  const { data: lensVersion, isLoading: versionLoading } = useQuery({
    queryKey: ['lens-version-config', versionId ?? `head-${lensId}`],
    queryFn: async () => {
      if (versionId) return lensesService.getVersionById(versionId)
      const published = await lensesService.getLatestPublishedVersion(lensId)
      if (published) return published
      return lensesService.getLatestVersion(lensId)
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!lensId,
  })

  // Reset local state when node changes
  useEffect(() => {
    setSelectedModelKey(
      currentConfig.model_id ??
      (typeof window !== 'undefined' ? (localStorage.getItem('lf-workflow-global-model') ?? '') : '')
    )
    setParamOverrides(currentConfig.param_overrides ?? {})
    setSelectedProviderKey('')
  }, [nodeId, currentConfig.model_id, currentConfig.param_overrides])

  const upstreamOutputs = useUpstreamNodeOutputs({ nodeId, edges, nodes, nodeResults })
  const hasRun = nodeResults.length > 0

  // Incoming edge mappings for this node (which params are auto-wired from previous nodes)
  const incomingEdges = edges.filter((e) => e.target_node_id === nodeId)
  const autoWiredParams = new Set(incomingEdges.map((e) => e.target_param_label))
  const selectedNode = nodes.find((n) => n.id === nodeId)
  const canEditLens =
    !!onEditLens &&
    !!currentUserId &&
    selectedNode?.lens_visibility === 'private' &&
    selectedNode?.lens_lenser_id === currentUserId

  const versionParams = useMemo(() => buildEffectiveVersionParams(lensVersion), [lensVersion])
  const isParamsLoading = versionLoading
  const editableParams = useMemo(
    () => versionParams.filter((p) => !autoWiredParams.has(p.label)),
    [versionParams, autoWiredParams],
  )

  // Derive providers/models from flat useAIModels list
  const providers: AIProvider[] = useMemo(() => {
    const seen = new Set<string>()
    return models
      .filter((m) => m.is_active && !!m.key && !seen.has(m.provider) && (seen.add(m.provider), true))
      .map((m) => ({ key: m.provider, display_name: m.providerDisplayName ?? m.provider, id: m.provider_id ?? '' }))
  }, [models])

  const providerModels: AIProviderModel[] = useMemo(() => {
    const effectiveProvider = selectedProviderKey || (
      nodeFunding.fundingSource === 'user_byok_cloud'
        ? (nodeFunding.availableKeys.find((k) => k.id === nodeFunding.selectedKeyRefId)?.providerKey ?? '')
        : nodeFunding.fundingSource === 'user_byok_local'
          ? (nodeFunding.localKeys.find((k) => k.id === nodeFunding.selectedLocalKeyId)?.provider ?? '')
          : selectedProviderKey
    )
    if (!effectiveProvider) return []
    return models
      .filter((m) => m.is_active && !!m.key && m.provider === effectiveProvider)
      .map((m) => ({ key: m.key, name: m.name, inputModalities: m.input_modalities }))
  }, [models, selectedProviderKey, nodeFunding.fundingSource, nodeFunding.selectedKeyRefId, nodeFunding.selectedLocalKeyId, nodeFunding.availableKeys, nodeFunding.localKeys])

  const handleSave = async () => {
    onSave(nodeId, {
      ...currentConfig,
      model_id: selectedModelKey || null,
      funding_source: nodeFunding.fundingSource,
      key_ref_id: nodeFunding.selectedKeyRefId,
      local_key_id: nodeFunding.selectedLocalKeyId,
      param_overrides: Object.keys(paramOverrides).length > 0 ? paramOverrides : undefined,
    })
    onClose()
  }

  const getSourceNodeLabel = (sourceNodeId: string) => {
    const node = nodes.find((n) => n.id === sourceNodeId)
    return node?.label ?? `Node ${(node?.ordinal ?? 0) + 1}`
  }

  return (
    <aside className="flex flex-col w-100 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            Configure Node
          </p>
          <p className="text-[11px] text-greyscale-400 truncate mt-0.5">{nodeLabel}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="!p-1 !h-6 !w-6 text-greyscale-400 hover:text-greyscale-700 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-2 border-surface-border">
          <div className="flex items-center justify-between gap-2">
            {canEditLens && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditLens?.(lensId)}
                className="!p-1 !h-6 !w-6 text-greyscale-400 hover:text-primary-yellow-600 transition-colors flex-shrink-0"
                title="Edit lens"
              >
                <Pencil size={12} />
              </Button>
            )}
          </div>
          {isParamsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-surface-raised animate-pulse" />
              ))}
            </div>
          ) : lensVersion ? (
            <LensBodyViewer content={lensVersion.templateBody} versionParams={lensVersion.parameters} />
          ) : (
            <div className="rounded-xl border border-surface-border p-3 text-[11px] text-greyscale-400 text-center">
              No version found for this lens.
            </div>
          )}
        </div>

        <FundingSourceToggle
          fundingSource={nodeFunding.fundingSource}
          onFundingSourceChange={nodeFunding.setFundingSource}
          selectedKeyRefId={nodeFunding.selectedKeyRefId}
          onKeyRefIdChange={nodeFunding.setSelectedKeyRefId}
          availableKeys={nodeFunding.availableKeys}
          selectedLocalKeyId={nodeFunding.selectedLocalKeyId}
          onLocalKeyIdChange={nodeFunding.setSelectedLocalKeyId}
          availableLocalKeys={nodeFunding.localKeys}
          localKeyAvailability={nodeFunding.localKeyAvailability}
          onAddLocalKey={nodeFunding.addLocalKey}
          onRemoveLocalKey={nodeFunding.removeLocalKey}
          onUpdateLocalKey={nodeFunding.updateLocalKey}
          onPairGateway={nodeFunding.pairGateway}
          onRefreshLocalKeys={nodeFunding.refreshLocalKeys}
          walletBalance={nodeFunding.walletBalance}
          canUseBYOK={nodeFunding.canUseBYOK}
          chainabitState={chainabit.state}
          chainabitModels={chainabit.models}
          onChainabitConnect={chainabit.reconnect}
          providers={providers}
          isLoadingProviders={modelsLoading}
          providerModels={providerModels}
          isLoadingModels={modelsLoading}
          selectedProviderKey={selectedProviderKey}
          onProviderChange={(key) => { setSelectedProviderKey(key); setSelectedModelKey('') }}
          selectedModelKey={selectedModelKey}
          onModelChange={setSelectedModelKey}
        />

        <WorkflowUpstreamOutputPanel upstreamOutputs={upstreamOutputs} hasRun={hasRun} />

        {/* Parameters from lens version */}
        {versionParams.length > 0 && (
          <div className="space-y-2">
            {/* Auto-wired params display */}
            {incomingEdges.map((edge) => {
              const paramLabel = edge.target_param_label
              if (!paramLabel) return null
              return (
                <div key={edge.id} className="space-y-1">
                  <label className="text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300 capitalize">
                    {paramLabel}
                  </label>
                  <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-greyscale-300 dark:border-greyscale-600 bg-surface-raised px-2.5 py-1.5">
                    <span className="text-[10px] text-greyscale-400">{'\u21B3'} auto from</span>
                    <span className="text-[10px] font-medium text-primary-yellow-600 truncate">
                      {getSourceNodeLabel(edge.source_node_id)}.{edge.source_output_key}
                    </span>
                  </div>
                </div>
              )
            })}
            {/* Manual param overrides (non-auto-wired) */}
            {editableParams.length > 0 && (
              <VersionParamFields
                params={editableParams}
                values={paramOverrides}
                errors={{}}
                onChange={(name, value) =>
                  setParamOverrides((prev) => ({ ...prev, [name]: String(value ?? '') }))
                }
                onImportJson={() => setJsonImportOpen(true)}
                onImportCsv={() => setCsvImportOpen(true)}
              />
            )}
          </div>
        )}

        {isParamsLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-surface-raised animate-pulse" />
            ))}
          </div>
        )}

        {!isParamsLoading && versionParams.length === 0 && lensVersion && (
          <div className="rounded-xl border border-surface-border p-3 text-[11px] text-greyscale-400 text-center">
            This lens version has no parameters.
          </div>
        )}

        {!isParamsLoading && !lensVersion && (
          <div className="rounded-xl border border-surface-border p-3 text-[11px] text-greyscale-400 text-center">
            No version found for this lens.
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-border">
          <Button variant="secondary" size="sm" onClick={onClose} className="w-auto">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="w-auto px-4">
            Save Config
          </Button>
        </div>
      </div>

      <JsonImportDialog
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        versionParams={editableParams}
        onApply={(patch) =>
          setParamOverrides((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v ?? '')])),
          }))
        }
        currentValues={paramOverrides}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        versionParams={editableParams}
        onApply={(patch) =>
          setParamOverrides((prev) => ({
            ...prev,
            ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v ?? '')])),
          }))
        }
        currentValues={paramOverrides}
      />

    </aside>
  )
}
