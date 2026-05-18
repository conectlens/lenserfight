import React, { useCallback, useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'

import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { HelpButton } from '@lenserfight/ui/components'
import { InlineNotice } from '@lenserfight/ui/feedback'

import type { ExportContext, ExportFormat, ExportKind } from '@lenserfight/domain/exports'
import { supabase } from '@lenserfight/data/supabase'
import { SupabaseExportsRepository } from '@lenserfight/data/exports'
import { useAuth } from '@lenserfight/features/auth'

import { useRuntimeMode } from '../hooks/useRuntimeMode'
import { useExportRunner } from '../hooks/useExportRunner'
import type { TransportId } from '../transport/ExportTransport'
import { CloudDownloadTransport } from '../transport/CloudDownloadTransport'
import { LocalDownloadTransport } from '../transport/LocalDownloadTransport'
import { DestinationSelector } from './DestinationSelector'
import { FormatSelector } from './FormatSelector'

export interface ExportModalProps<T> {
  open: boolean
  onClose: () => void
  kind: ExportKind
  slug: string
  title?: string
  fetchPayload: () => Promise<T>
  /** True when the current user owns this entity (affects redaction). */
  isOwner?: boolean
  /** Formats this entity supports (EX-1: markdown + json only). */
  availableFormats?: ExportFormat[]
  /** Override the run-export handler — primarily for tests / Storybook. */
  onConfirm?: (input: { format: ExportFormat; destination: TransportId }) => Promise<void>
}

/**
 * Composition root for the export UX. Reuses libs/ui primitives — Dialog,
 * ModalFooter, SegmentedControl (via FormatSelector + DestinationSelector),
 * InlineNotice, HelpButton — instead of raw HTML.
 *
 * GRASP: Controller. Coordinates user input → orchestrator call via
 * useExportRunner. onConfirm overrides the runner for tests / Storybook.
 */
export function ExportModal<T>({
  open,
  onClose,
  kind,
  slug,
  title,
  fetchPayload,
  isOwner = false,
  availableFormats,
  onConfirm,
}: ExportModalProps<T>) {
  const mode = useRuntimeMode()
  const { user, isAuthenticated } = useAuth()
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [destination, setDestination] = useState<TransportId>(
    mode === 'cloud' ? 'cloud-download' : 'local-download',
  )
  const [isRunning, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const runExportDefault = useExportRunner<T>({
    kind,
    slug,
    title,
    fetchPayload,
    buildContext,
    resolveTransport,
  })

  const helpPath = useMemo(() => {
    const map: Record<ExportKind, string> = {
      battle: '/explanation/architecture/universal-export-system',
      workflow: '/explanation/architecture/universal-export-system',
      lens: '/explanation/architecture/universal-export-system',
      agent: '/explanation/architecture/universal-export-system',
      bundle: '/explanation/architecture/universal-export-system',
    }
    return map[kind]
  }, [kind])

  const handleConfirm = async () => {
    setError(null)
    setRunning(true)
    try {
      if (onConfirm) {
        await onConfirm({ format, destination })
      } else {
        await runExportDefault({ format, destination })
      }
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Export failed')
    } finally {
      setRunning(false)
    }
  }

  const headerTitle = title ? `Export "${title}"` : `Export ${kind}`
  const safeHeader = headerTitle.length > 60 ? `${headerTitle.slice(0, 57)}...` : headerTitle

  return (
    <Dialog
      open={open}
      onClose={isRunning ? undefined : onClose}
      title={safeHeader}
      description={`Kind: ${kind} · Slug: ${slug}`}
      icon={<FileDown size={18} />}
      maxWidth="max-w-lg"
      dismissOnBackdrop={!isRunning}
      footer={
        <ModalFooter
          leftButton={{
            label: 'Cancel',
            onClick: onClose,
            disabled: isRunning,
            variant: 'secondary',
            className: 'flex-1',
          }}
          primaryButton={{
            label: isRunning ? 'Exporting…' : 'Export',
            onClick: handleConfirm,
            isLoading: isRunning,
            disabled: isRunning,
            variant: 'primary',
            className: 'flex-1',
          }}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-greyscale-500 dark:text-greyscale-400">
              Format
            </label>
            <HelpButton path={helpPath} label="Export docs" />
          </div>
          <FormatSelector
            value={format}
            onChange={setFormat}
            available={availableFormats}
            disabled={isRunning}
          />
          <p className="text-xs text-greyscale-500 dark:text-greyscale-400">
            {format === 'markdown'
              ? 'Markdown is portable (GitHub-renderable) and includes a checksum footer.'
              : format === 'json'
                ? 'JSON is canonical (RFC 8785 key order). Identical content yields identical checksums.'
                : 'YAML is GitOps-portable: block style only, no anchors / aliases.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-greyscale-500 dark:text-greyscale-400">
            Destination
          </label>
          <DestinationSelector
            mode={mode}
            value={destination}
            onChange={setDestination}
            disabled={isRunning}
          />
        </section>

        {error ? (
          <InlineNotice variant="error" title="Export failed">
            {error}
          </InlineNotice>
        ) : (
          <InlineNotice variant="info">
            Exports apply the redaction policy: secrets, BYOK tokens, and judge prompts are
            always stripped. Owner-only fields (email, billing) are stripped unless you own
            the entity.
          </InlineNotice>
        )}
      </div>
    </Dialog>
  )
}
