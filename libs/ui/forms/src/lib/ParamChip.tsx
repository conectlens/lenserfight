import React from 'react'
import { LensParamType } from '@lenserfight/types'

// ─── Per-type color map (used for the type badge inside the tooltip) ──────────
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  string:      { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-700' },
  number:      { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700' },
  integer:     { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700' },
  float:       { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700' },
  decimal:     { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700' },
  boolean:     { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-700' },
  select:      { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-300',    border: 'border-teal-200 dark:border-teal-700' },
  multiselect: { bg: 'bg-teal-50 dark:bg-teal-900/20',    text: 'text-teal-700 dark:text-teal-300',    border: 'border-teal-200 dark:border-teal-700' },
  array:       { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-700' },
  url:         { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    text: 'text-cyan-700 dark:text-cyan-300',    border: 'border-cyan-200 dark:border-cyan-700' },
  date:        { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-700' },
  datetime:    { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-700 dark:text-rose-300',    border: 'border-rose-200 dark:border-rose-700' },
  file:        { bg: 'bg-gray-50 dark:bg-gray-800/40',    text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-200 dark:border-gray-600' },
  text:        { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-700' },
  textarea:    { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-700' },
  json:        { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700' },
}

// ─── Per-parameter unique color palette (deterministic by name hash) ──────────
// Each unique parameter key gets a stable, distinct chip color regardless of type.
// A simple char-code sum hash distributes names evenly across 12 hues.
const PARAM_PALETTE = [
  { bg: 'bg-violet-100 dark:bg-violet-900/30',  text: 'text-violet-800 dark:text-violet-200',  border: 'border-violet-300 dark:border-violet-700' },
  { bg: 'bg-sky-100 dark:bg-sky-900/30',        text: 'text-sky-800 dark:text-sky-200',        border: 'border-sky-300 dark:border-sky-700' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/30',text: 'text-emerald-800 dark:text-emerald-200',border: 'border-emerald-300 dark:border-emerald-700' },
  { bg: 'bg-rose-100 dark:bg-rose-900/30',      text: 'text-rose-800 dark:text-rose-200',      border: 'border-rose-300 dark:border-rose-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-800 dark:text-amber-200',    border: 'border-amber-300 dark:border-amber-700' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/30',      text: 'text-cyan-800 dark:text-cyan-200',      border: 'border-cyan-300 dark:border-cyan-700' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30',  text: 'text-indigo-800 dark:text-indigo-200',  border: 'border-indigo-300 dark:border-indigo-700' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-800 dark:text-teal-200',      border: 'border-teal-300 dark:border-teal-700' },
  { bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',text: 'text-fuchsia-800 dark:text-fuchsia-200',border: 'border-fuchsia-300 dark:border-fuchsia-700' },
  { bg: 'bg-lime-100 dark:bg-lime-900/30',      text: 'text-lime-800 dark:text-lime-200',      border: 'border-lime-300 dark:border-lime-700' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-800 dark:text-orange-200',  border: 'border-orange-300 dark:border-orange-700' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30',      text: 'text-pink-800 dark:text-pink-200',      border: 'border-pink-300 dark:border-pink-700' },
]

function paramColorIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return hash % PARAM_PALETTE.length
}

interface ParamChipProps {
  name: string
  type?: LensParamType | string
  required?: boolean
  onClick?: () => void
  readonly?: boolean
  size?: 'xs' | 'sm'
  className?: string
  /** Rich tooltip fields (from LensVersionParam). Shown on hover in readonly mode. */
  label?: string | null
  helpText?: string | null
  defaultValue?: string | null
  /** When true, the chip is draggable and sets [[name]] as drag data. */
  draggable?: boolean
}

export const ParamChip: React.FC<ParamChipProps> = ({
  name,
  type = 'string',
  required = true,
  onClick,
  readonly = false,
  size = 'sm',
  className = '',
  label,
  helpText,
  defaultValue,
  draggable: isDraggable = false,
}) => {
  const colors = PARAM_PALETTE[paramColorIndex(name)]
  const typeColors = TYPE_COLORS[type] ?? TYPE_COLORS.string
  const isInteractive = !readonly && !!onClick

  const sizeClass = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px] gap-1'
    : 'px-2 py-1 text-xs gap-1.5'

  const borderStyle = required
    ? `border ${colors.border}`
    : `border border-dashed ${colors.border}`

  const hasTooltip = readonly && (label || helpText || defaultValue || type)

  return (
    <span className={`relative inline-flex group/chip align-middle ${className}`}>
      <span
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={isInteractive ? onClick : undefined}
        onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
        draggable={isDraggable || undefined}
        onDragStart={isDraggable ? (e) => { e.dataTransfer.setData('text/plain', `[[${name}]]`); e.dataTransfer.effectAllowed = 'copy' } : undefined}
        className={`inline-flex items-center rounded-md font-mono font-medium select-none whitespace-nowrap ${sizeClass} ${colors.bg} ${colors.text} ${borderStyle} ${isInteractive ? 'cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity' : ''} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <span className="opacity-50">[</span>
        {name}
        <span className="opacity-50">]</span>
        {!required && (
          <span className="text-[9px] opacity-50 font-sans font-normal ml-0.5">opt</span>
        )}
      </span>

      {/* Hover tooltip — only in readonly mode when rich data is available */}
      {hasTooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 mb-1.5 z-50 hidden group-hover/chip:flex flex-col gap-1 min-w-[160px] max-w-[240px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg px-3 py-2 text-xs"
        >
          {/* Parameter name + type badge */}
          <span className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 truncate">
              {label && label !== name ? label : name}
            </span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors.bg} ${typeColors.text}`}>
              {type}
            </span>
          </span>

          {/* Required / optional */}
          <span className={`text-[10px] font-medium ${required ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {required ? 'required' : 'optional'}
          </span>

          {/* Help text */}
          {helpText && (
            <span className="text-gray-500 dark:text-gray-400 leading-snug">
              {helpText}
            </span>
          )}

          {/* Default value */}
          {defaultValue != null && defaultValue !== '' && (
            <span className="text-gray-400 dark:text-gray-500 text-[10px]">
              default: <span className="font-mono text-gray-600 dark:text-gray-300">{defaultValue}</span>
            </span>
          )}
        </span>
      )}
    </span>
  )
}
