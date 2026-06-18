import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Check, ClipboardCopy } from 'lucide-react'
import React, { useState, useMemo } from 'react'

interface SavedPresetExportModalProps {
  isOpen: boolean
  onClose: () => void
  preset: { name: string; values: Record<string, unknown> }
  format: 'json' | 'csv'
  versionParams?: Array<{ label: string }>
}

function buildCsvText(
  values: Record<string, unknown>,
  versionParams?: Array<{ label: string }>
): string {
  const keys = versionParams?.map((p) => p.label) ?? Object.keys(values)

  const escapeCell = (v: unknown): string => {
    const str =
      typeof v === 'object' && v \!== null ? JSON.stringify(v) : String(v ?? '')
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str
  }

  const header = keys.map(escapeCell).join(',')
  const row = keys.map((k) => escapeCell(values[k])).join(',')
  return `${header}\n${row}`
}

export const SavedPresetExportModal: React.FC<SavedPresetExportModalProps> = ({
  isOpen,
  onClose,
  preset,
  format,
  versionParams,
}) => {
  const [copied, setCopied] = useState(false)

  const text = useMemo(() => {
    if (format === 'json') return JSON.stringify(preset.values, null, 2)
    return buildCsvText(preset.values, versionParams)
  }, [preset.values, format, versionParams])

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard failed
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={`${preset.name} — ${format.toUpperCase()}`}
      maxWidth="max-w-lg"
      footer={
        <ModalFooter
          leftButton={{ label: 'Close', onClick: onClose, variant: 'secondary' }}
          primaryButton={
            copied
              ? {
                  label: 'Copied\!',
                  onClick: handleCopy,
                  className: 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600',
                }
              : { label: 'Copy', onClick: handleCopy }
          }
        />
      }
    >
      <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-sunken">
        <pre className="p-4 text-xs text-greyscale-800 dark:text-greyscale-200 whitespace-pre-wrap break-all leading-relaxed">
          {text}
        </pre>
      </div>
    </Dialog>
  )
}
