import { lensesService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { useAIModels } from '@lenserfight/features/generations'
import type { WorkflowEdgeRecord, WorkflowNodeRecord } from '@lenserfight/data/repositories'
import type { WorkflowNodeConfig } from './WorkflowCanvasNode'

interface WorkflowNodeConfigPanelProps {
  nodeId: string
  lensId: string
  nodeLabel: string
  currentConfig: WorkflowNodeConfig
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
}

export function WorkflowNodeConfigPanel({
  nodeId,
  lensId,
  nodeLabel,
  currentConfig,
  nodes,
  edges,
  onSave,
  onClose,
}: WorkflowNodeConfigPanelProps) {
  const [modelId, setModelId] = useState<string>(currentConfig.model_id ?? '')
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>(
    currentConfig.param_overrides ?? {}
  )

  const { models, isLoading: modelsLoading } = useAIModels()

  const { data: lensDetail } = useQuery({
    queryKey: ['lens-detail-config', lensId],
    queryFn: () => lensesService.getLensDetail(lensId),
    staleTime: 1000 * 60 * 5,
    enabled: !!lensId,
  })

  // Reset local state when node changes
  useEffect(() => {
    setModelId(currentConfig.model_id ?? '')
    setParamOverrides(currentConfig.param_overrides ?? {})
  }, [nodeId, currentConfig.model_id, currentConfig.param_overrides])

  // Incoming edge mappings for this node (which params are auto-wired from previous nodes)
  const incomingEdges = edges.filter((e) => e.target_node_id === nodeId)
  const autoWiredParams = new Set(incomingEdges.map((e) => e.target_param_label))

  const params = lensDetail?.params ?? []

  const modelOptions = [
    { value: '', label: 'Use global model (default)' },
    ...models
      .filter((m) => !!m.key && m.is_active)
      .map((m) => ({ value: m.key, label: `${m.name} (${m.provider})` })),
  ]

  const handleSave = () => {
    onSave(nodeId, {
      ...currentConfig,
      model_id: modelId || null,
      param_overrides: Object.keys(paramOverrides).length > 0 ? paramOverrides : undefined,
    })
    onClose()
  }

  const getSourceNodeLabel = (sourceNodeId: string) => {
    const node = nodes.find((n) => n.id === sourceNodeId)
    return node?.label ?? `Node ${(node?.ordinal ?? 0) + 1}`
  }

  return (
    <aside className="flex flex-col w-72 flex-shrink-0 border-l border-surface-border bg-surface-base overflow-hidden">
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
        {/* Model override */}
        <div className="space-y-1.5">
          <SelectField
            label="AI Model"
            value={modelId}
            onChange={setModelId}
            options={modelOptions}
            placeholder={modelsLoading ? 'Loading models…' : 'Use global model (default)'}
            disabled={modelsLoading}
          />
          <p className="text-[10px] text-greyscale-400 leading-tight">
            Leave blank to use the global model selected at run time.
          </p>
        </div>

        {/* Parameters */}
        {params.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-greyscale-400">
              Parameters
            </p>
            {params.map((param) => {
              const paramName = param.name
              const isAutoWired = autoWiredParams.has(paramName)
              const edge = incomingEdges.find((e) => e.target_param_label === paramName)
              return (
                <div key={paramName} className="space-y-1">
                  <label className="text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300 capitalize">
                    {paramName}{param.required && <span className="text-status-red ml-0.5">*</span>}
                  </label>
                  {isAutoWired && edge ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-greyscale-300 dark:border-greyscale-600 bg-surface-raised px-2.5 py-1.5">
                      <span className="text-[10px] text-greyscale-400">↳ auto from</span>
                      <span className="text-[10px] font-medium text-primary-yellow-600 truncate">
                        {getSourceNodeLabel(edge.source_node_id)}.{edge.source_output_key}
                      </span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={paramOverrides[paramName] ?? ''}
                      onChange={(e) =>
                        setParamOverrides((prev) => ({ ...prev, [paramName]: e.target.value }))
                      }
                      placeholder={param.placeholder ?? `Value for {{${paramName}}}`}
                      className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {params.length === 0 && !lensDetail && (
          <div className="rounded-xl border border-surface-border p-3 text-[11px] text-greyscale-400 text-center">
            Loading lens parameters…
          </div>
        )}

        {params.length === 0 && lensDetail && (
          <div className="rounded-xl border border-surface-border p-3 text-[11px] text-greyscale-400 text-center">
            This lens has no parameters.
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-border">
        <Button variant="secondary" size="sm" onClick={onClose} className="w-auto">
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} className="w-auto px-4">
          Save Config
        </Button>
      </div>
    </aside>
  )
}
