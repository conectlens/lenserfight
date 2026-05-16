import React, { useRef, useState } from 'react'
import {
  Type, AlignLeft, Code2, Hash, ToggleLeft,
  ChevronDown, Link, Calendar, Paperclip, Upload, AlertCircle,
  ListChecks, List,
} from 'lucide-react'
import { LensVersionParam, LensVersionParamType } from '@lenserfight/types'
import { FormError } from '@lenserfight/ui/components'
import { SelectField } from './SelectField'

// ─── Tool Registry ────────────────────────────────────────────────────────────

interface ToolConfig {
  icon: React.ElementType
  colorClass: string
  label: string
}

const TOOL_REGISTRY: Record<LensVersionParamType, ToolConfig> = {
  text:     { icon: Type,        colorClass: 'text-blue-500',   label: 'Text' },
  textarea: { icon: AlignLeft,   colorClass: 'text-indigo-500', label: 'Long Text' },
  json:     { icon: Code2,       colorClass: 'text-orange-500', label: 'JSON' },
  number:   { icon: Hash,        colorClass: 'text-amber-500',  label: 'Number' },
  integer:  { icon: Hash,        colorClass: 'text-amber-500',  label: 'Integer' },
  float:    { icon: Hash,        colorClass: 'text-amber-500',  label: 'Float' },
  decimal:  { icon: Hash,        colorClass: 'text-amber-500',  label: 'Decimal' },
  boolean:  { icon: ToggleLeft,  colorClass: 'text-purple-500', label: 'Toggle' },
  select:      { icon: ChevronDown, colorClass: 'text-teal-500',   label: 'Select' },
  multiselect: { icon: ListChecks,  colorClass: 'text-emerald-500', label: 'Multi-select' },
  array:       { icon: List,        colorClass: 'text-sky-500',     label: 'List' },
  url:         { icon: Link,        colorClass: 'text-green-500',  label: 'URL' },
  date:     { icon: Calendar,    colorClass: 'text-rose-500',   label: 'Date' },
  datetime: { icon: Calendar,    colorClass: 'text-rose-500',   label: 'Datetime' },
  file:     { icon: Paperclip,   colorClass: 'text-slate-500',  label: 'File' },
}

const NUMERIC_TYPES: LensVersionParamType[] = ['integer', 'float', 'decimal', 'number']

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

// ─── File Input Sub-component ────────────────────────────────────────────────

interface FileToolInputProps {
  param: LensVersionParam
  value?: string
  onChange: (mediaObjectId: string) => void
  onFileUpload?: (key: string, file: File) => Promise<string>
  error?: string
  modelInputModalities?: string[]
}

const FileToolInput: React.FC<FileToolInputProps> = ({
  param,
  value,
  onChange,
  onFileUpload,
  error,
}) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const accept = param.tool.validationSchema?.allowedMimeTypes?.join(',') ?? undefined

  const processFile = async (file: File) => {
    setLocalError(null)
    if (!onFileUpload) {
      setLocalError('File upload handler not configured.')
      return
    }
    setUploading(true)
    try {
      const mediaObjectId = await onFileUpload(param.label, file)
      onChange(mediaObjectId)
    } catch (err) {
      setLocalError((err as Error).message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await processFile(file)
  }

  const displayError = localError ?? error

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 p-3 rounded-lg border-2 border-dashed cursor-pointer transition-all ${
          isDragOver
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
      >
        <Upload size={16} className={`flex-shrink-0 ${isDragOver ? 'text-primary-500' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {uploading ? 'Uploading…' : value ? '✓ File attached' : 'Drop file here or click to browse'}
          </span>
          {accept && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">{accept}</p>
          )}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {displayError && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
}

// ─── ToolField (Factory) ──────────────────────────────────────────────────────

export interface ToolFieldProps {
  param: LensVersionParam
  value: unknown
  onChange: (value: unknown) => void
  onFileUpload?: (key: string, file: File) => Promise<string>
  error?: string
  disabled?: boolean
  modelInputModalities?: string[]
}

/**
 * Tool factory that renders the correct form input for a LensVersionParam.
 * GRASP: Information Expert — single authority on param-to-input mapping.
 * All field type/validation metadata is read from param.tool (ToolRecord).
 */
export const ToolField: React.FC<ToolFieldProps> = ({
  param,
  value,
  onChange,
  onFileUpload,
  error,
  disabled = false,
  modelInputModalities,
}) => {
  const tool = param.tool
  const config = TOOL_REGISTRY[tool.type] ?? TOOL_REGISTRY.text
  const Icon = config.icon
  const isNumeric = NUMERIC_TYPES.includes(tool.type)

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        <Icon size={11} className={config.colorClass} aria-hidden />
        <span>{param.label}</span>
        {tool.required && <span className="text-red-500 ml-0.5" aria-label="required">*</span>}
        {tool.helpText && (
          <span className="ml-1 normal-case text-gray-400 font-normal">— {tool.helpText}</span>
        )}
      </label>

      {/* Input */}
      {(tool.type === 'text' || tool.type === 'json') && (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tool.placeholder ?? `Enter ${param.label}…`}
          disabled={disabled}
          className={inputClass}
        />
      )}

      {tool.type === 'textarea' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tool.placeholder ?? `Enter ${param.label}…`}
          rows={3}
          disabled={disabled}
          className={`${inputClass} resize-none`}
        />
      )}

      {isNumeric && (
        <input
          type="number"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tool.placeholder ?? `Enter ${param.label}…`}
          min={tool.validationSchema?.min ?? undefined}
          max={tool.validationSchema?.max ?? undefined}
          step={tool.type === 'integer' ? 1 : 'any'}
          disabled={disabled}
          className={inputClass}
        />
      )}

      {tool.type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">{param.label}</span>
        </label>
      )}

      {tool.type === 'select' && (
        <SelectField
          value={(value as string) ?? ''}
          onChange={(v) => onChange(v)}
          placeholder={tool.placeholder ?? `Select ${param.label}…`}
          options={tool.options ?? []}
          disabled={disabled}
        />
      )}

      {tool.type === 'url' && (
        <input
          type="url"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tool.placeholder ?? 'https://…'}
          disabled={disabled}
          className={inputClass}
        />
      )}

      {tool.type === 'date' && (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      )}

      {tool.type === 'datetime' && (
        <input
          type="datetime-local"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputClass}
        />
      )}

      {tool.type === 'multiselect' && tool.options && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tool.options.map((opt) => {
            const selected = Array.isArray(value) ? (value as string[]) : []
            const isChecked = selected.includes(opt.value)
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-all ${
                  isChecked
                    ? 'bg-primary-50 border-primary-200 text-primary-900 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-100'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const next = isChecked
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value]
                    onChange(next)
                  }}
                  disabled={disabled}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span>{opt.label}</span>
              </label>
            )
          })}
        </div>
      )}

      {tool.type === 'array' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={tool.placeholder ?? 'item1, item2, item3'}
          rows={3}
          disabled={disabled}
          className={`${inputClass} resize-none`}
        />
      )}

      {tool.type === 'file' && (
        <FileToolInput
          param={param}
          value={value as string | undefined}
          onChange={(mediaObjectId) => onChange(mediaObjectId)}
          onFileUpload={onFileUpload}
          error={error}
          modelInputModalities={modelInputModalities}
        />
      )}

      {tool.type !== 'file' && error && <FormError message={error} />}
    </div>
  )
}
