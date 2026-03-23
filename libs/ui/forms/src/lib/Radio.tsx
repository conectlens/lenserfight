import React, { createContext, useContext, useId } from 'react'

// ── RadioGroup context ───────────────────────────────────────────────────────

interface RadioGroupContextType {
  name: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const RadioGroupContext = createContext<RadioGroupContextType | undefined>(undefined)

// ── RadioGroup ───────────────────────────────────────────────────────────────

export interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  disabled,
  children,
  className = '',
  orientation = 'vertical',
}) => {
  return (
    <RadioGroupContext.Provider value={{ name, value, onChange, disabled }}>
      <div
        role="radiogroup"
        className={`flex ${orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap gap-4'} ${className}`}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

// ── Radio ────────────────────────────────────────────────────────────────────

export interface RadioProps {
  value: string
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}

/**
 * Radio button. Must be used inside a RadioGroup.
 *
 * @example
 * <RadioGroup name="size" value={size} onChange={setSize}>
 *   <Radio value="sm" label="Small" />
 *   <Radio value="lg" label="Large" />
 * </RadioGroup>
 */
export const Radio: React.FC<RadioProps> = ({
  value: radioValue,
  label,
  disabled: radioPropDisabled,
  className = '',
}) => {
  const ctx = useContext(RadioGroupContext)
  const autoId = useId()

  const name = ctx?.name ?? autoId
  const groupValue = ctx?.value ?? ''
  const onChange = ctx?.onChange
  const disabled = radioPropDisabled ?? ctx?.disabled ?? false
  const checked = groupValue === radioValue

  return (
    <label
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input
        type="radio"
        name={name}
        value={radioValue}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(radioValue)}
        className={`
          h-4 w-4 appearance-none rounded-full border-2 cursor-pointer
          border-greyscale-300 dark:border-greyscale-600
          bg-surface-raised shadow-neu-inset-1
          checked:border-deep-lens-navy-500 checked:bg-deep-lens-navy-500
          dark:checked:border-primary-yellow-500 dark:checked:bg-primary-yellow-500
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500/50
          transition-all duration-fast ease-standard
          ${disabled ? 'cursor-not-allowed' : ''}
        `}
      />
      {label && (
        <span className="text-sm text-greyscale-700 dark:text-greyscale-300">{label}</span>
      )}
    </label>
  )
}

Radio.displayName = 'Radio'
RadioGroup.displayName = 'RadioGroup'
