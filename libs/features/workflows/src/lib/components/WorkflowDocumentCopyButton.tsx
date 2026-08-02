/**
 * Copies the workflow on the canvas as a portable protocol document.
 *
 * This is deliberately not the `ExportButton` sitting next to it. That one
 * produces a shareable guide from the persisted record — internal ids,
 * visibility and timestamps included — and nothing accepts it back. This one
 * produces exactly what the import dialog reads, which is what closes the loop:
 * import, edit on the canvas, export, import again.
 *
 * Lens definitions are built from node labels alone, because the builder never
 * loads lens bodies and fetching one per lens would be a query per node for
 * something the importer already recovers from: a definition whose title
 * matches a lens the importing user owns is reused unchanged, and only an
 * unmatched title creates a placeholder lens to fill in.
 */
import {
  MIN_WORKFLOW_TITLE_LENGTH,
  WORKFLOW_DOCUMENT_FORMATS,
  writeWorkflowDocument,
  type WorkflowDocumentFormat,
} from '@lenserfight/domain/workflow-protocol'
import { buildWorkflowDocument, type ExportLensSource } from '@lenserfight/infra/workflow-authoring'
import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Check, Copy } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

import type {
  WorkflowEdgeRecord,
  WorkflowNodeRecord,
  WorkflowRecord,
} from '@lenserfight/data/repositories'

const COPY_FEEDBACK_MS = 2000

const FORMAT_LABELS: Record<WorkflowDocumentFormat, string> = {
  json: 'JSON',
  yaml: 'YAML',
}

export interface WorkflowDocumentCopyButtonProps {
  workflow: Pick<WorkflowRecord, 'title' | 'description'>
  nodes: readonly WorkflowNodeRecord[]
  edges: readonly WorkflowEdgeRecord[]
}

export function WorkflowDocumentCopyButton({
  workflow,
  nodes,
  edges,
}: WorkflowDocumentCopyButtonProps) {
  const [copiedFormat, setCopiedFormat] = useState<WorkflowDocumentFormat | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleCopy = async (format: WorkflowDocumentFormat) => {
    try {
      const protocolDocument = buildWorkflowDocument({
        workflow,
        nodes,
        edges,
        lensesById: buildLensSources(nodes),
      })
      await copyTextToClipboard(writeWorkflowDocument(protocolDocument, format))
      setCopiedFormat(format)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCopiedFormat(null), COPY_FEEDBACK_MS)
    } catch {
      setCopiedFormat(null)
    }
  }

  return (
    <div
      role="group"
      aria-label="Copy as workflow document"
      className="flex items-center gap-0.5 rounded-xl border border-surface-border bg-surface-base px-1.5 py-1 shadow-sm"
    >
      {copiedFormat ? (
        <Check
          size={12}
          aria-hidden
          className="flex-shrink-0 text-primary-yellow-600 dark:text-primary-yellow-500"
        />
      ) : (
        <Copy size={12} aria-hidden className="flex-shrink-0 text-greyscale-400" />
      )}
      {WORKFLOW_DOCUMENT_FORMATS.map((format) => (
        <button
          key={format}
          type="button"
          onClick={() => handleCopy(format)}
          disabled={nodes.length === 0}
          aria-label={`Copy as ${FORMAT_LABELS[format]} workflow document`}
          title={`Copy this workflow as a ${FORMAT_LABELS[format]} document you can paste into the import dialog`}
          className="rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-greyscale-500 transition-colors hover:bg-surface-raised hover:text-greyscale-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-greyscale-100"
        >
          {FORMAT_LABELS[format]}
        </button>
      ))}
      <span className="sr-only" aria-live="polite">
        {copiedFormat ? `${FORMAT_LABELS[copiedFormat]} workflow document copied` : ''}
      </span>
    </div>
  )
}

/**
 * Names every lens the graph references so no step carries a `lensRef` the
 * document does not define — a dangling ref fails import validation outright.
 * The node label is the only lens-facing text the builder holds.
 */
function buildLensSources(
  nodes: readonly WorkflowNodeRecord[],
): ReadonlyMap<string, ExportLensSource> {
  const sources = new Map<string, ExportLensSource>()
  for (const node of nodes) {
    if (!node.lens_id || sources.has(node.lens_id)) continue
    const label = node.label?.trim() ?? ''
    sources.set(node.lens_id, {
      id: node.lens_id,
      // The protocol rejects a lens title shorter than the minimum, so a label
      // like "AI" would make the whole document unreadable on re-import. The id
      // is an unhelpful but valid stand-in the author can rename afterwards.
      title: label.length >= MIN_WORKFLOW_TITLE_LENGTH ? label : node.lens_id,
    })
  }
  return sources
}
