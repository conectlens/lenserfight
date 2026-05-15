import React, { useCallback, useState } from 'react'
import { Download } from 'lucide-react'

import { Button } from '@lenserfight/ui/components'

import type { ExportContext, ExportFormat, ExportKind } from '@lenserfight/domain/exports'
import { supabase } from '@lenserfight/data/supabase'
import { SupabaseExportsRepository } from '@lenserfight/data/exports'
import { useAuth } from '@lenserfight/features/auth'

import { CloudDownloadTransport } from '../transport/CloudDownloadTransport'
import { LocalDownloadTransport } from '../transport/LocalDownloadTransport'
import type { TransportId } from '../transport/ExportTransport'
import { useExportRunner } from '../hooks/useExportRunner'
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
  const { user, isAuthenticated } = useAuth()

  const buildContext = useCallback((): ExportContext => ({
    userId: user?.id ?? null,
    tenantId: null,
    via: 'web',
    host: typeof window !== 'undefined' ? window.location.host : '',
    isOwner,
    isAuthenticated,
  }), [user?.id, isOwner, isAuthenticated])

  const resolveTransport = useCallback((id: TransportId) => {
    if (id === 'local-download') return new LocalDownloadTransport()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new CloudDownloadTransport(new SupabaseExportsRepository(supabase as any))
  }, [])

  const runExportInner = useExportRunner<T>({
    kind,
    slug,
    title,
    fetchPayload,
    buildContext,
    resolveTransport,
  })
  const runExport = useCallback(
    async (input: { format: ExportFormat; destination: TransportId }) => { await runExportInner(input) },
    [runExportInner],
  )

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
        onConfirm={runExport}
      />
    </>
  )
}
