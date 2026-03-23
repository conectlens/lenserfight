import React, { useId } from 'react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
  error?: boolean
  hint?: string
}

/**
 * Accessible checkbox with label support.
 *
 * @example
 * <Checkbox label="I agree to the terms" checked={checked} onChange={setChecked} />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, hint, className = '', id: idProp, disabled, ...props }, ref) => {
    const autoId = useId()
    const id = idProp ?? autoId

    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <label
          htmlFor={id}
          className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            className={`
              h-4 w-4 rounded border-2 appearance-none cursor-pointer
              border-greyscale-300 dark:border-greyscale-600
              bg-surface-raised shadow-neu-inset-1
              checked:bg-deep-lens-navy-500 checked:border-deep-lens-navy-500
              dark:checked:bg-primary-yellow-500 dark:checked:border-primary-yellow-500
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
              transition-all duration-fast ease-standard
              ${error ? 'border-status-red' : ''}
              ${disabled ? 'cursor-not-allowed' : ''}
            `}
            {...props}
          />
          {label && (
            <span className="text-sm text-greyscale-700 dark:text-greyscale-300">{label}</span>
          )}
        </label>
        {hint && (
          <p className="ml-6.5 text-xs text-greyscale-500">{hint}</p>
        )}
        {error && (
          <p role="alert" className="ml-6.5 text-xs text-status-red">
            This field is required.
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
