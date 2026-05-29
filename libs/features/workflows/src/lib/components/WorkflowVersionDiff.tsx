import type {
  WorkflowEdgeRecord,
  WorkflowNodeRecord,
  WorkflowVersionRecord,
} from '@lenserfight/data/repositories'
import { Dialog } from '@lenserfight/ui/overlays'
import { ChevronDown, ChevronRight, GitCompare, RotateCcw } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

export interface WorkflowVersionSnapshot {
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
}

export type WorkflowVersion = WorkflowVersionRecord & {
  snapshot: WorkflowVersionSnapshot
}

interface WorkflowVersionDiffProps {
  workflowId: string
  versionA: WorkflowVersion
  versionB: WorkflowVersion
  open: boolean
  onOpenChange: (b: boolean) => void
  isLoading?: boolean
  canRestore?: boolean
  onRestoreVersion?: (versionId: string) => void
  isRestoring?: boolean
}

const NODE_LIMIT = 50

export type NodeDiffKind = 'added' | 'removed' | 'modified' | 'unchanged'
export type EdgeDiffKind = 'added' | 'removed' | 'unchanged'

export interface NodeDiffEntry {
  id: string
  kind: NodeDiffKind
  a: WorkflowNodeRecord | null
  b: WorkflowNodeRecord | null
  /** Field names that differ when kind is 'modified'. */
  changedFields?: string[]
}

export interface EdgeDiffEntry {
  id: string
  kind: EdgeDiffKind
  a: WorkflowEdgeRecord | null
  b: WorkflowEdgeRecord | null
}

/**
 * Diffs two node arrays by id. A node is "modified" when its data, position,
 * lens_id, or label differ between sides.
 */
export function diffNodes(
  a: WorkflowNodeRecord[],
  b: WorkflowNodeRecord[],
): NodeDiffEntry[] {
  const mapA = new Map(a.map((n) => [n.id, n]))
  const mapB = new Map(b.map((n) => [n.id, n]))
  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()])
  const entries: NodeDiffEntry[] = []

  for (const id of ids) {
    const nodeA = mapA.get(id) ?? null
    const nodeB = mapB.get(id) ?? null

    if (nodeA && !nodeB) {
      entries.push({ id, kind: 'removed', a: nodeA, b: null })
      continue
    }
    if (!nodeA && nodeB) {
      entries.push({ id, kind: 'added', a: null, b: nodeB })
      continue
    }
    if (nodeA && nodeB) {
      const changed = nodeChangedFields(nodeA, nodeB)
      if (changed.length === 0) {
        entries.push({ id, kind: 'unchanged', a: nodeA, b: nodeB })
      } else {
        entries.push({ id, kind: 'modified', a: nodeA, b: nodeB, changedFields: changed })
      }
    }
  }
  return entries
}

function nodeChangedFields(a: WorkflowNodeRecord, b: WorkflowNodeRecord): string[] {
  const changed: string[] = []
  if (a.position_x !== b.position_x || a.position_y !== b.position_y) changed.push('position')
  if ((a.lens_id ?? null) !== (b.lens_id ?? null)) changed.push('lens_id')
  if ((a.version_id ?? null) !== (b.version_id ?? null)) changed.push('version_id')
  if ((a.label ?? null) !== (b.label ?? null)) changed.push('label')
  if (JSON.stringify(a.config ?? null) !== JSON.stringify(b.config ?? null)) changed.push('config')
  return changed
}

export function diffEdges(
  a: WorkflowEdgeRecord[],
  b: WorkflowEdgeRecord[],
): EdgeDiffEntry[] {
  const mapA = new Map(a.map((e) => [e.id, e]))
  const mapB = new Map(b.map((e) => [e.id, e]))
  const ids = new Set<string>([...mapA.keys(), ...mapB.keys()])
  const entries: EdgeDiffEntry[] = []

  for (const id of ids) {
    const edgeA = mapA.get(id) ?? null
    const edgeB = mapB.get(id) ?? null
    if (edgeA && !edgeB) entries.push({ id, kind: 'removed', a: edgeA, b: null })
    else if (!edgeA && edgeB) entries.push({ id, kind: 'added', a: null, b: edgeB })
    else if (edgeA && edgeB) entries.push({ id, kind: 'unchanged', a: edgeA, b: edgeB })
  }
  return entries
}

const KIND_BADGE: Record<NodeDiffKind, string> = {
  added: 'bg-green-500/15 text-green-600 dark:text-green-400',
  removed: 'bg-red-500/15 text-red-600 dark:text-red-400',
  modified: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  unchanged: 'bg-greyscale-200/40 text-greyscale-400 dark:bg-greyscale-700/30',
}

export function WorkflowVersionDiff({
  versionA,
  versionB,
  open,
  onOpenChange,
  isLoading = false,
  canRestore = false,
  onRestoreVersion,
  isRestoring = false,
}: WorkflowVersionDiffProps) {
  const nodesA = versionA.snapshot.nodes
  const nodesB = versionB.snapshot.nodes
  const edgesA = versionA.snapshot.edges
  const edgesB = versionB.snapshot.edges

  const tooLarge = nodesA.length > NODE_LIMIT || nodesB.length > NODE_LIMIT

  const nodeEntries = useMemo(
    () => (tooLarge ? [] : diffNodes(nodesA, nodesB)),
    [nodesA, nodesB, tooLarge],
  )
  const edgeEntries = useMemo(
    () => (tooLarge ? [] : diffEdges(edgesA, edgesB)),
    [edgesA, edgesB, tooLarge],
  )
  const changedNodeEntries = useMemo(
    () => nodeEntries.filter((entry) => entry.kind !== 'unchanged'),
    [nodeEntries],
  )
  const [activeNodeIndex, setActiveNodeIndex] = useState(0)
  const activeNodeId = changedNodeEntries[activeNodeIndex]?.id ?? null

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'j' && event.key !== 'k') return
      if (changedNodeEntries.length === 0) return
      event.preventDefault()
      setActiveNodeIndex((current) => {
        const delta = event.key === 'j' ? 1 : -1
        return (current + delta + changedNodeEntries.length) % changedNodeEntries.length
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changedNodeEntries.length, open])

  useEffect(() => {
    setActiveNodeIndex(0)
  }, [versionA.id, versionB.id])

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={`Compare v${versionA.version_number} ↔ v${versionB.version_number}`}
      icon={<GitCompare size={16} />}
      maxWidth="max-w-3xl"
    >
      {isLoading ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          Loading version snapshots…
        </p>
      ) : tooLarge ? (
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          Diff too large to display safely ({nodesA.length} vs {nodesB.length} nodes, limit{' '}
          {NODE_LIMIT}).
        </p>
      ) : nodesA.length === 0 && nodesB.length === 0 ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          No snapshot rows were returned for these versions. The version may be missing archived node data or you may not have access.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <DiffSection title="Nodes" total={nodeEntries.length}>
            {nodeEntries.map((entry) => (
              <NodeDiffRow
                key={entry.id}
                entry={entry}
                selected={entry.id === activeNodeId}
                restoreVersionNumber={versionA.version_number}
                canRestore={canRestore}
                onRestore={() => onRestoreVersion?.(versionA.id)}
                isRestoring={isRestoring}
              />
            ))}
          </DiffSection>
          <DiffSection title="Edges" total={edgeEntries.length}>
            {edgeEntries.map((entry) => (
              <EdgeDiffRow key={entry.id} entry={entry} />
            ))}
          </DiffSection>
        </div>
      )}
    </Dialog>
  )
}

function DiffSection({
  title,
  total,
  children,
}: {
  title: string
  total: number
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-greyscale-500">
        {title} ({total})
      </h3>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  )
}

function NodeDiffRow({
  entry,
  selected,
  restoreVersionNumber,
  canRestore,
  onRestore,
  isRestoring,
}: {
  entry: NodeDiffEntry
  selected: boolean
  restoreVersionNumber: number
  canRestore: boolean
  onRestore: () => void
  isRestoring: boolean
}) {
  const [expanded, setExpanded] = useState(entry.kind === 'modified')
  const canExpand = entry.kind === 'modified'
  const displayLabel =
    entry.b?.label ?? entry.a?.label ?? entry.b?.lens_id ?? entry.a?.lens_id ?? entry.id

  return (
    <div
      className={`rounded-lg border p-2 text-xs ${
        selected ? 'border-primary-yellow-500 ring-1 ring-primary-yellow-500/50' : 'border-surface-border'
      } ${entry.kind === 'unchanged' ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={() => canExpand && setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
        disabled={!canExpand}
      >
        {canExpand &&
          (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        <span className={`rounded px-1.5 py-0.5 font-medium ${KIND_BADGE[entry.kind]}`}>
          {entry.kind}
        </span>
        <span className="truncate text-greyscale-700 dark:text-greyscale-200">
          {displayLabel}
        </span>
        {entry.changedFields && entry.changedFields.length > 0 && (
          <span className="ml-auto text-[10px] text-greyscale-400">
            {entry.changedFields.join(', ')}
          </span>
        )}
      </button>
      {canRestore && entry.kind !== 'unchanged' && (
        <button
          type="button"
          onClick={onRestore}
          disabled={isRestoring}
          className="mt-2 inline-flex items-center gap-1 rounded border border-surface-border px-1.5 py-0.5 text-[10px] font-medium text-greyscale-600 hover:bg-surface-raised disabled:opacity-50 dark:text-greyscale-300"
        >
          <RotateCcw size={10} />
          {isRestoring ? 'Restoring…' : `Restore v${restoreVersionNumber}`}
        </button>
      )}
      {expanded && entry.kind === 'modified' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <JsonDelta value={entry.a} />
          <JsonDelta value={entry.b} />
        </div>
      )}
    </div>
  )
}

function EdgeDiffRow({ entry }: { entry: EdgeDiffEntry }) {
  const edge = entry.b ?? entry.a
  if (!edge) return null
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-surface-border p-2 text-xs ${
        entry.kind === 'unchanged' ? 'opacity-50' : ''
      }`}
    >
      <span className={`rounded px-1.5 py-0.5 font-medium ${KIND_BADGE[entry.kind]}`}>
        {entry.kind}
      </span>
      <span className="truncate font-mono text-[10px] text-greyscale-500">
        {edge.source_node_id.slice(0, 8)} → {edge.target_node_id.slice(0, 8)}
      </span>
    </div>
  )
}

function JsonDelta({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded bg-surface-base p-2 text-[10px] text-greyscale-600 dark:text-greyscale-300 language-json">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  )
}
