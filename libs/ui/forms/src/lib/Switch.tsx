import React, { useId } from 'react'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: React.ReactNode
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  id?: string
  className?: string
}

const trackSizes = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
}

const thumbSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
}

const thumbTranslate = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
}

/**
 * Toggle switch. Accessible via role=switch.
 *
 * @example
 * <Switch checked={enabled} onChange={setEnabled} label="Enable notifications" />
 */
export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id: idProp,
  className = '',
}) => {
  const autoId = useId()
  const id = idProp ?? autoId

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative flex-shrink-0 inline-flex items-center rounded-full
          transition-colors duration-normal ease-standard
          ${trackSizes[size]}
          ${checked
            ? 'bg-deep-lens-navy-500 dark:bg-primary-yellow-500'
            : 'bg-greyscale-200 dark:bg-greyscale-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50 focus-visible:ring-offset-2
          shadow-neu-inset-1
        `}
      >
        <span
          className={`
            ${thumbSizes[size]}
            inline-block rounded-full bg-white shadow-sm
            transform transition-transform duration-normal ease-spring
            ${checked ? thumbTranslate[size] : 'translate-x-1'}
          `}
        />
      </button>
      {(label || description) && (
        <label htmlFor={id} className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          {label && (
            <span className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300">
              {label}
            </span>
          )}
          {description && (
            <span className="block text-xs text-greyscale-500 dark:text-greyscale-500 mt-0.5">
              {description}
            </span>
          )}
        </label>
      )}
    </div>
  )
}

Switch.displayName = 'Switch'
