import { lensesService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import React, { useState, useMemo } from 'react'

import type { WorkflowNodeRecord, WorkflowEdgeRecord } from '@lenserfight/data/repositories'

interface WorkflowRootInputsPanelProps {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  onSubmit: (rootInputs: Record<string, string>) => void
  isRunning: boolean
}

/** Extract [[param]] placeholder labels from a template string. */
function extractPlaceholders(template: string): string[] {
  const matches = template.matchAll(/\[\[([^\]]+)\]\]/g)
  return [...new Set([...matches].map((m) => m[1]))]
}

/**
 * Identifies root nodes (no incoming edges) and loads their lens templates
 * to extract un-wired [[param]] placeholders that need user input.
 */
export function WorkflowRootInputsPanel({ nodes, edges, onSubmit, isRunning }: WorkflowRootInputsPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({})

  // Root nodes = nodes with no incoming edges
  const targetNodeIds = useMemo(() => new Set(edges.map((e) => e.target_node_id)), [edges])
  const rootNodes = useMemo(() => nodes.filter((n) => !targetNodeIds.has(n.id)), [nodes, targetNodeIds])

  // Auto-wired params (by incoming edges)
  const autoWiredParams = useMemo(() => {
    const wired = new Set<string>()
    for (const e of edges) {
      wired.add(e.target_param_label)
    }
    return wired
  }, [edges])

  // Load templates for root nodes to extract placeholders
  const { data: rootParams = [], isLoading } = useQuery({
    queryKey: ['workflow-root-params', rootNodes.map((n) => n.id).join(',')],
    queryFn: async () => {
      const results: { nodeId: string; nodeLabel: string; params: string[] }[] = []
      for (const node of rootNodes) {
        const version = node.version_id
          ? await lensesService.getVersionById(node.version_id)
          : await lensesService.getLatestPublishedVersion(node.lens_id)
        if (!version?.templateBody) continue
        const placeholders = extractPlaceholders(version.templateBody)
        const unWired = placeholders.filter((p) => !autoWiredParams.has(p))
        if (unWired.length > 0) {
          results.push({
            nodeId: node.id,
            nodeLabel: node.label ?? `Node ${node.ordinal + 1}`,
            params: unWired,
          })
        }
      }
      return results
    },
    enabled: rootNodes.length > 0,
    staleTime: 1000 * 60 * 5,
  })

  // Flatten all params for the input form
  const allParams = useMemo(() => {
    const params: { label: string; nodeLabel: string }[] = []
    const seen = new Set<string>()
    for (const r of rootParams) {
      for (const p of r.params) {
        if (!seen.has(p)) {
          seen.add(p)
          params.push({ label: p, nodeLabel: r.nodeLabel })
        }
      }
    }
    return params
  }, [rootParams])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-raised animate-pulse" />
        ))}
      </div>
    )
  }

  if (allParams.length === 0) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(inputs)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border-b border-surface-border">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-greyscale-400" />
        <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
          Workflow Inputs
        </p>
      </div>

      <div className="space-y-3">
        {allParams.map(({ label, nodeLabel }) => (
          <div key={label} className="space-y-1">
            <label className="text-[11px] font-medium text-greyscale-600 dark:text-greyscale-300 capitalize">
              {label}
              <span className="ml-1 text-[10px] text-greyscale-400 font-normal">({nodeLabel})</span>
            </label>
            <input
              type="text"
              value={inputs[label] ?? ''}
              onChange={(e) => setInputs((prev) => ({ ...prev, [label]: e.target.value }))}
              placeholder={`Value for [[${label}]]`}
              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            />
          </div>
        ))}
      </div>

      <Button type="submit" size="sm" disabled={isRunning} className="w-full">
        {isRunning ? 'Running…' : 'Start Run'}
      </Button>
    </form>
  )
}
