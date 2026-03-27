import React, { useId } from 'react'
import { Button } from '@lenserfight/ui/components'

export interface SegmentedOption<T extends string = string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  fullWidth?: boolean
  className?: string
  'aria-label'?: string
}

/**
 * Tab-style exclusive single selection control.
 * Renders as an accessible radiogroup.
 *
 * @example
 * <SegmentedControl
 *   options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]}
 *   value={view}
 *   onChange={setView}
 * />
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const groupId = useId()

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`
        inline-flex rounded-xl p-1
        bg-surface-sunken shadow-neu-inset-1
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={option.disabled}
            id={`${groupId}-${option.value}`}
            onClick={() => onChange(option.value)}
            variant="ghost"
            size={size}
            className={`
              flex-1 !font-medium !rounded-lg
              transition-all duration-normal ease-standard
              focus:outline-none focus:ring-0
              focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
              ${isSelected
                ? '!bg-surface-raised shadow-neu-2 !text-greyscale-900 dark:!text-greyscale-50'
                : '!text-greyscale-500 dark:!text-greyscale-500 hover:!text-greyscale-700 dark:hover:!text-greyscale-300'
              }
              ${size === 'sm' ? '!h-7 !text-xs !px-3 !py-0' : '!h-9 !text-sm !px-4 !py-0'}
            `}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}

SegmentedControl.displayName = 'SegmentedControl'
