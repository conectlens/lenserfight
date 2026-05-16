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
}

export const VersionParamFields: React.FC<VersionParamFieldsProps> = ({
  params,
  values,
  errors,
  onChange,
  onFileUpload,
  selectedModelInputModalities,
}) => {
  return (
    <>
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
