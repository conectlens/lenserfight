import React from 'react'
import { ToolField } from '@lenserfight/ui/forms'
import { LensVersionParam } from '@lenserfight/types'

interface VersionParamFieldsProps {
  params: LensVersionParam[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onChange: (name: string, value: unknown) => void
  onFileUpload?: (key: string, file: File) => Promise<string>
  selectedModelInputModalities?: string[]
  /** When set, shows an “Import JSON” control that opens the parent’s JSON import flow. */
  onImportJson?: () => void
  /** When set, shows an “Import CSV” control that opens the parent’s CSV import flow. */
  onImportCsv?: () => void
}

export const VersionParamFields: React.FC<VersionParamFieldsProps> = ({
  params,
  values,
  errors,
  onChange,
  onFileUpload,
  selectedModelInputModalities,
  onImportJson,
  onImportCsv,
}) => {
  const showImportRow = Boolean(onImportJson || onImportCsv)
  return (
    <>
      {showImportRow && (
        <div className="flex flex-wrap items-center gap-2 pb-2 mb-1 border-b border-greyscale-200 dark:border-greyscale-700">
          {onImportJson && (
            <button
              type="button"
              onClick={onImportJson}
              className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Import JSON
            </button>
          )}
          {onImportCsv && (
            <button
              type="button"
              onClick={onImportCsv}
              className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              Import CSV
            </button>
          )}
        </div>
      )}
      {params.map((param) => (
        <ToolField
          key={param.label}
          param={param}
          value={values[param.label]}
          onChange={(v) => onChange(param.label, v)}
          onFileUpload={onFileUpload}
          error={errors[param.label]}
          modelInputModalities={selectedModelInputModalities}
        />
      ))}
    </>
  )
}
