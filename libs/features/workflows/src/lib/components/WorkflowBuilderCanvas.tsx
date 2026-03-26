import { Button } from '@lenserfight/ui/components'
import { lensesService } from '@lenserfight/data/repositories'
import type { WorkflowNodeRecord, WorkflowEdgeRecord, UpsertNodeInput, UpsertEdgeInput } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useSaveWorkflow } from '../hooks/useSaveWorkflow'

interface WorkflowBuilderCanvasProps {
  workflowId: string
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  readOnly?: boolean
}

interface PendingNode {
  tempId: string
  lens_id: string
  lensTitle: string
  label: string
  ordinal: number
}

export function WorkflowBuilderCanvas({ workflowId, nodes, edges, readOnly }: WorkflowBuilderCanvasProps) {
  const [query, setQuery] = useState('')
  const [pendingNodes, setPendingNodes] = useState<PendingNode[]>([])
  const [saved, setSaved] = useState(false)
  const { mutateAsync: saveWorkflow, isPending: saving } = useSaveWorkflow()

  const { data: searchResults = [] } = useQuery({
    queryKey: ['lens-search-workflow-builder', query],
    queryFn: async () => {
      const resp = await lensesService.search(query, 0, 6)
      return resp.data ?? []
    },
    enabled: query.length >= 2,
    staleTime: 5000,
  })

  const allNodes = [
    ...nodes.map((n) => ({ id: n.id, label: n.label, ordinal: n.ordinal, lens_id: n.lens_id, isPersisted: true })),
    ...pendingNodes.map((n) => ({ id: n.tempId, label: n.label, ordinal: n.ordinal, lens_id: n.lens_id, isPersisted: false })),
  ].sort((a, b) => a.ordinal - b.ordinal)

  const addLens = (lens: { id: string; title: string }) => {
    const ordinal = allNodes.length
    setPendingNodes((prev) => [
      ...prev,
      { tempId: `tmp-${Date.now()}`, lens_id: lens.id, lensTitle: lens.title, label: lens.title, ordinal },
    ])
    setQuery('')
    setSaved(false)
  }

  const removeNode = (id: string) => {
    setPendingNodes((prev) => prev.filter((n) => n.tempId !== id))
  }

  const handleSave = async () => {
    const upsertNodes: UpsertNodeInput[] = [
      ...nodes.map((n) => ({ id: n.id, lens_id: n.lens_id, version_id: n.version_id, label: n.label, ordinal: n.ordinal, position_x: n.position_x, position_y: n.position_y })),
      ...pendingNodes.map((n, i) => ({ lens_id: n.lens_id, version_id: null, label: n.label, ordinal: nodes.length + i, position_x: i * 200, position_y: 0 })),
    ]
    const upsertEdges: UpsertEdgeInput[] = edges.map((e) => ({
      id: e.id,
      source_node_id: e.source_node_id,
      target_node_id: e.target_node_id,
      source_output_key: e.source_output_key,
      target_param_label: e.target_param_label,
    }))
    await saveWorkflow({ workflowId, nodes: upsertNodes, edges: upsertEdges })
    setPendingNodes([])
    setSaved(true)
  }

  return (
    <div className="space-y-4">
      {/* Node list */}
      <div className="space-y-2">
        {allNodes.length === 0 && (
          <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-sm text-greyscale-400">
            Add your first lens to start building
          </div>
        )}
        {allNodes.map((node, i) => (
          <div key={node.id} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-surface-base text-xs font-bold text-greyscale-500">
              {i + 1}
            </span>
            <span className="text-sm font-medium text-greyscale-900 dark:text-greyscale-50 flex-1 truncate">
              {node.label}
            </span>
            {!node.isPersisted && !readOnly && (
              <button type="button" onClick={() => removeNode(node.id)} className="text-greyscale-400 hover:text-status-red transition-colors">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <>
          {/* Lens search */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Plus size={14} className="text-greyscale-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Add a lens…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-2xl border border-surface-border bg-surface-base px-3 py-2 text-sm text-greyscale-900 placeholder:text-greyscale-400 outline-none focus:border-status-blue dark:bg-surface-raised dark:text-greyscale-50"
              />
            </div>
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 rounded-2xl border border-surface-border bg-surface-base divide-y divide-surface-border overflow-hidden shadow-lg">
                {searchResults.map((lens) => (
                  <li key={lens.id}>
                    <button
                      type="button"
                      onClick={() => addLens({ id: lens.id, title: lens.title })}
                      className="w-full px-4 py-2.5 text-left text-sm text-greyscale-900 hover:bg-surface-raised transition-colors dark:text-greyscale-50"
                    >
                      {lens.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(pendingNodes.length > 0 || nodes.length > 0) && (
            <div className="flex items-center gap-3">
              <Button onClick={handleSave} isLoading={saving} size="sm" className="w-auto">
                Save workflow
              </Button>
              {saved && (
                <span className="text-xs text-status-green font-medium">Saved</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
