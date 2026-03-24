import React from 'react'
import { LensParamType } from '@lenserfight/types'

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

const DEFAULT_COLORS = TYPE_COLORS.string

interface ParamChipProps {
  name: string
  type?: LensParamType | string
  required?: boolean
  onClick?: () => void
  readonly?: boolean
  size?: 'xs' | 'sm'
  className?: string
}

export const ParamChip: React.FC<ParamChipProps> = ({
  name,
  type = 'string',
  required = true,
  onClick,
  readonly = false,
  size = 'sm',
  className = '',
}) => {
  const colors = TYPE_COLORS[type] ?? DEFAULT_COLORS
  const isInteractive = !readonly && !!onClick

  const sizeClass = size === 'xs'
    ? 'px-1.5 py-0.5 text-[10px] gap-1'
    : 'px-2 py-1 text-xs gap-1.5'

  const borderStyle = required
    ? `border ${colors.border}`
    : `border border-dashed ${colors.border}`

  return (
    <span
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
      className={`inline-flex items-center rounded-md font-mono font-medium select-none align-middle whitespace-nowrap ${sizeClass} ${colors.bg} ${colors.text} ${borderStyle} ${isInteractive ? 'cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity' : ''} ${className}`}
    >
      <span className="opacity-50">{'{'}</span>
      {name}
      <span className="opacity-50">{'}'}</span>
      {!required && (
        <span className="text-[9px] opacity-50 font-sans font-normal ml-0.5">opt</span>
      )}
    </span>
  )
}
