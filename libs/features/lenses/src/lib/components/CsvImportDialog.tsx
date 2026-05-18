import React, { useMemo, useState, useEffect } from 'react'
import { Clipboard, Check, Zap } from 'lucide-react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Button } from '@lenserfight/ui/components'
import { LensVersionParam, LensParam } from '@lenserfight/types'
import { parseCsvText, coerceCsvRow, buildCsvTemplate, ParsedCsv } from '../hooks/useParamImport'

interface CsvImportDialogProps {
  open: boolean
  onClose: () => void
  versionParams?: LensVersionParam[]
  onApply: (values: Record<string, unknown>) => void
  currentValues?: Record<string, unknown>
}

const DELIMITER_LABELS: Record<string, string> = {
  ',': 'comma',
  '\t': 'tab',
  ';': 'semicolon',
}

export const CsvImportDialog: React.FC<CsvImportDialogProps> = ({
  open,
  onClose,
  versionParams = [],
  onApply,
  currentValues,
}) => {
  const [rawText, setRawText] = useState('')
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null)
  const [selectedRowIndex, setSelectedRowIndex] = useState(0)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [copiedTemplate, setCopiedTemplate] = useState(false)

  // Build typed CSV template from actual params
  const templateCsv = useMemo(
    () => buildCsvTemplate(versionParams),
    [versionParams],
  )

  // Pre-populate with current values when dialog opens
  useEffect(() => {
    if (!open) return
    if (!currentValues) return
    const allParamKeys = versionParams.map((p) => p.label)
    const matchedKeys = allParamKeys.filter((k) => currentValues[k] !== undefined && currentValues[k] !== '')
    if (matchedKeys.length > 0) {
      const headerRow = matchedKeys.join(',')
      const valueRow = matchedKeys.map((k) => {
        const v = currentValues[k]
        const str = Array.isArray(v) ? v.join('|') : String(v ?? '')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }).join(',')
      setRawText(`${headerRow}\n${valueRow}`)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-compute which header columns match a param
  const allParamKeys = versionParams.map((p) => p.label)

  const isHeaderMatched = (header: string): boolean => {
    const h = header.trim().toLowerCase()
    return allParamKeys.some((k) => k.toLowerCase() === h)
  }

  const handleCopyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(templateCsv)
      setCopiedTemplate(true)
      setTimeout(() => setCopiedTemplate(false), 2000)
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  const handleParse = () => {
    if (!rawText.trim()) return
    const result = parseCsvText(rawText)
    setParsedCsv(result)
    setSelectedRowIndex(0)
    setRowErrors({})
  }

  const handleApply = () => {
    if (!parsedCsv || parsedCsv.rows.length === 0) return
    const row = parsedCsv.rows[selectedRowIndex] ?? []
    const { values, errors } = coerceCsvRow(parsedCsv.headers, row, versionParams)
    if (Object.keys(errors).length > 0) {
      setRowErrors(errors)
      return
    }
    onApply(values)
    setRawText('')
    setParsedCsv(null)
    setRowErrors({})
    onClose()
  }

  const handleClose = () => {
    setRawText('')
    setParsedCsv(null)
    setRowErrors({})
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import parameters from CSV"
      description="Paste CSV data. The first row must be headers matching parameter labels."
      maxWidth="max-w-2xl"
      footer={
        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: handleClose, variant: 'ghost' }}
          primaryButton={{
            label: `Apply row ${parsedCsv && parsedCsv.rows.length > 0 ? selectedRowIndex + 1 : ''}`,
            onClick: handleApply,
            disabled: !parsedCsv || parsedCsv.rows.length === 0,
          }}
        />
      }
    >
      <div className="flex flex-col gap-4">
        {/* Step 1: paste area */}
        <div className="flex flex-col gap-2">
          <textarea
            value={rawText}
            onChange={(e) => { setRawText(e.target.value); setParsedCsv(null); setRowErrors({}) }}
            placeholder={templateCsv || 'param1,param2\nvalue1,value2'}
            rows={6}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyTemplate}
              disabled={!templateCsv}
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
            {parsedCsv && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Detected delimiter:{' '}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {DELIMITER_LABELS[parsedCsv.delimiter] ?? parsedCsv.delimiter}
                </span>
                {' '}· {parsedCsv.rows.length} data row{parsedCsv.rows.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Step 2: row selector table */}
        {parsedCsv && parsedCsv.headers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a row to import. Bold columns match a parameter.
            </p>

            {parsedCsv.rows.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 px-1">
                No data rows found — only headers were detected.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-2 py-2 w-8" />
                      {parsedCsv.headers.map((h, i) => (
                        <th
                          key={i}
                          className={`px-3 py-2 text-left whitespace-nowrap ${
                            isHeaderMatched(h)
                              ? 'font-semibold text-primary-600 dark:text-primary-400'
                              : 'font-normal text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {h}
                          {!isHeaderMatched(h) && (
                            <span className="ml-1 text-[10px] text-gray-300 dark:text-gray-600">(unmatched)</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {parsedCsv.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className={`cursor-pointer transition-colors ${
                          selectedRowIndex === ri
                            ? 'bg-primary-50 dark:bg-primary-950'
                            : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => { setSelectedRowIndex(ri); setRowErrors({}) }}
                      >
                        <td className="px-2 py-2 text-center">
                          <input
                            type="radio"
                            checked={selectedRowIndex === ri}
                            onChange={() => { setSelectedRowIndex(ri); setRowErrors({}) }}
                            className="accent-primary-500"
                          />
                        </td>
                        {parsedCsv.headers.map((_, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-2 font-mono whitespace-nowrap truncate max-w-[180px] ${
                              isHeaderMatched(parsedCsv.headers[ci])
                                ? 'text-gray-800 dark:text-gray-200'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}
                          >
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Coercion errors from last apply attempt */}
            {Object.keys(rowErrors).length > 0 && (
              <div className="flex flex-col gap-1 px-1">
                {Object.entries(rowErrors).map(([k, msg]) => (
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
