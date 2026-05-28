import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import { LensParam, LensParamType } from '@lenserfight/types'
import { SelectField } from './SelectField'

const PARAM_TYPES: { value: LensParamType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'select', label: 'Select' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'array', label: 'Array' },
]

const inputClass =
  'w-full px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all'

interface ParamEditPopoverProps {
  param: LensParam
  onUpdate: (patch: Partial<LensParam>) => void
  onRemove: () => void
  anchorRect: DOMRect
  onClose: () => void
}

export const ParamEditPopover: React.FC<ParamEditPopoverProps> = ({
  param,
  onUpdate,
  onRemove,
  anchorRect,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [optionsText, setOptionsText] = useState(
    (param.options ?? []).map((o) => (o.label === o.value ? o.value : `${o.label}:${o.value}`)).join(', ')
  )

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Position: below the anchor, clamped to viewport
  const top = anchorRect.bottom + 6
  const left = Math.min(anchorRect.left, window.innerWidth - 260)

  const handleOptionsChange = (raw: string) => {
    setOptionsText(raw)
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [label, value] = s.split(':').map((p) => p.trim())
        return { label: label ?? s, value: value ?? label ?? s }
      })
    onUpdate({ options: parsed })
  }

  const content = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl w-[240px] overflow-hidden"
      style={{ top, left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
        <code className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
          {`{{${param.name}}}`}
        </code>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={12} className="text-gray-400" />
        </button>
      </div>

      {/* Fields */}
      <div className="p-3 space-y-3">
        {/* Type */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Type
          </label>
          <SelectField
            value={param.type}
            onChange={(val) => onUpdate({ type: val as LensParamType, options: undefined, arrayFormat: undefined })}
            options={PARAM_TYPES}
            className="w-full"
          />
        </div>

        {/* Required */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={param.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="w-3.5 h-3.5 accent-primary cursor-pointer"
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">Required</span>
        </label>

        {/* Default value (not for boolean/select) */}
        {param.type !== 'boolean' && param.type !== 'select' && param.type !== 'multiselect' && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Default
            </label>
            <input
              type="text"
              value={param.default ?? ''}
              onChange={(e) => onUpdate({ default: e.target.value || undefined })}
              placeholder="Default value"
              className={inputClass}
            />
          </div>
        )}

        {/* Boolean default */}
        {param.type === 'boolean' && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Default
            </label>
            <SelectField
              value={param.default ?? ''}
              onChange={(val) => onUpdate({ default: val || undefined })}
              options={[
                { value: '', label: 'No default' },
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
              className="w-full"
            />
          </div>
        )}

        {/* Options for select/multiselect */}
        {(param.type === 'select' || param.type === 'multiselect') && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Options
            </label>
            <input
              type="text"
              value={optionsText}
              onChange={(e) => handleOptionsChange(e.target.value)}
              placeholder="label:value, label2:value2"
              className={inputClass}
            />
          </div>
        )}

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Description
          </label>
          <input
            type="text"
            value={param.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value || undefined })}
            placeholder="Help text"
            className={inputClass}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          <Trash2 size={11} />
          Remove parameter
        </button>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
