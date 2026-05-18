import React, { useMemo, useState, useEffect } from 'react'
import { Clipboard, Check, Zap } from 'lucide-react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Button } from '@lenserfight/ui/components'
import { LensVersionParam, LensParam } from '@lenserfight/types'
import { coerceJsonImport, buildJsonTemplate, ImportResult } from '../hooks/useParamImport'

interface JsonImportDialogProps {
  open: boolean
  onClose: () => void
  versionParams?: LensVersionParam[]
  onApply: (values: Record<string, unknown>) => void
  currentValues?: Record<string, unknown>
}

export const JsonImportDialog: React.FC<JsonImportDialogProps> = ({
  open,
  onClose,
  versionParams = [],
  onApply,
  currentValues,
}) => {
  const [rawText, setRawText] = useState('')
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)

  // Pre-populate with current values when dialog opens
  useEffect(() => {
    if (!open) return
    if (!currentValues) return
    const allParamKeys = versionParams.map((p) => p.label)
    const filtered = Object.fromEntries(
      Object.entries(currentValues).filter(([k, v]) => allParamKeys.includes(k) && v !== undefined && v !== '')
    )
    if (Object.keys(filtered).length > 0) {
      setRawText(JSON.stringify(filtered, null, 2))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalParams = versionParams.length

  // Build typed template from actual params
  const templateJson = useMemo(
    () => buildJsonTemplate(versionParams),
    [versionParams],
  )

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateJson)
      setCopiedTemplate(true)
      setTimeout(() => setCopiedTemplate(false), 2000)
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  const handleParse = () => {
    if (!rawText.trim()) return
    const result = coerceJsonImport(rawText, versionParams)
    setParseResult(result)
  }

  const handleApply = () => {
    if (!parseResult) return
    onApply(parseResult.values)
    setRawText('')
    setParseResult(null)
    onClose()
  }

  const handleClose = () => {
    setRawText('')
    setParseResult(null)
    onClose()
  }

  const hasParseError = !!parseResult?.errors['_parse']
  const coercionErrorCount = parseResult
    ? Object.keys(parseResult.errors).filter((k) => k !== '_parse').length
    : 0
  const matchedCount = parseResult ? Object.keys(parseResult.values).length : 0
  const canApply = !!parseResult && !hasParseError && coercionErrorCount === 0 && matchedCount > 0

  // All param labels/names for display in the preview
  const allParamKeys = versionParams.map((p) => p.label)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import parameters from JSON"
      description="Paste a JSON object. Keys must match parameter labels."
      maxWidth="max-w-lg"
      footer={
        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: handleClose, variant: 'ghost' }}
          primaryButton={{
            label: `Apply${matchedCount > 0 ? ` ${matchedCount} field${matchedCount !== 1 ? 's' : ''}` : ''}`,
            onClick: handleApply,
            disabled: !canApply,
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <textarea
          value={rawText}
          onChange={(e) => { setRawText(e.target.value); setParseResult(null) }}
          placeholder={templateJson || '{\n  "param_label": "value"\n}'}
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyTemplate}
            disabled={!templateJson}
            className="flex items-center gap-1.5"
          >
            {copiedTemplate ? <Check size={13} /> : <Clipboard size={13} />}
            {copiedTemplate ? 'Copied!' : 'Copy template'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleParse}
            disabled={!rawText.trim()}
            className="flex items-center gap-1.5"
          >
            <Zap size={13} />
            Parse
          </Button>
        </div>

        {/* Parse error */}
        {hasParseError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {parseResult!.errors['_parse']}
          </div>
        )}

        {/* Preview table */}
        {parseResult && !hasParseError && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Matched{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-200">{matchedCount}</span>
              {' '}/ {totalParams} parameters
            </p>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Parameter</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Value</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {allParamKeys.map((key) => {
                    const hasValue = key in parseResult.values
                    const hasError = key in parseResult.errors
                    const rawVal = parseResult.values[key]
                    const displayVal = rawVal !== undefined ? String(rawVal).slice(0, 40) : '—'

                    return (
                      <tr key={key} className="bg-white dark:bg-gray-900">
                        <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{key}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono truncate max-w-[160px]">
                          {hasValue ? displayVal : <span className="text-gray-300 dark:text-gray-600">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {hasError ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                              Error
                            </span>
                          ) : hasValue ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">
                              Skipped
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Coercion errors */}
            {coercionErrorCount > 0 && (
              <div className="flex flex-col gap-1">
                {Object.entries(parseResult.errors)
                  .filter(([k]) => k !== '_parse')
                  .map(([k, msg]) => (
                    <p key={k} className="text-xs text-red-600 dark:text-red-400">{msg}</p>
                  ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Dialog>
  )
}
