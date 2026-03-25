import React from 'react'
import { FileJson, Table2 } from 'lucide-react'
import { ToolField } from '@lenserfight/ui/forms'
import { LensVersionParam } from '@lenserfight/types'

interface VersionParamFieldsProps {
  params: LensVersionParam[]
  values: Record<string, unknown>
  errors: Record<string, string>
  onChange: (name: string, value: unknown) => void
  onFileUpload?: (key: string, file: File) => Promise<string>
  selectedModelInputModalities?: string[]
  onImportJson: () => void
  onImportCsv: () => void
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Parameters
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onImportJson}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Import from JSON"
          >
            <FileJson size={12} />
            JSON
          </button>
          <button
            type="button"
            onClick={onImportCsv}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Import from CSV"
          >
            <Table2 size={12} />
            CSV
          </button>
        </div>
      </div>
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
    </div>
  )
}
