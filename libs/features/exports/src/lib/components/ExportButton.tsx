import React, { useState } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@lenserfight/ui/components'

import type { ExportKind } from '@lenserfight/domain/exports'

import { ExportModal } from './ExportModal'

export interface ExportButtonProps<T> {
  /** Entity kind being exported. */
  kind: ExportKind
  /** Slug (kebab-case identifier) for filename generation. */
  slug: string
  /** Caller's display title — surfaced in the modal header. */
  title?: string
  /** Async loader for the payload — invoked on confirm, not on mount. */
  fetchPayload: () => Promise<T>
  /** Optional caller-supplied class (size, alignment). */
  className?: string
  /** Override the button label; default "Export". */
  label?: string
  /** True when the current user owns this entity (affects redaction). */
  isOwner?: boolean
}

/**
 * Single client-island trigger. Reused everywhere — header action group,
 * list toolbar, detail page. Same component, different props.
 *
 * GRASP: Information Expert (it owns "open the export modal for this
 * entity"), Low Coupling (callers pass a thunk, no fetch logic leaks).
 */
export function ExportButton<T>({
  kind,
  slug,
  title,
  fetchPayload,
  className,
  label = 'Export',
  isOwner = false,
}: ExportButtonProps<T>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label || 'Export'}
      >
        <Download size={14} className={label ? 'mr-1.5' : undefined} />
        {label || null}
      </Button>
      <ExportModal
        open={open}
        onClose={() => setOpen(false)}
        kind={kind}
        slug={slug}
        title={title}
        fetchPayload={fetchPayload}
        isOwner={isOwner}
      />
    </>
  )
}
