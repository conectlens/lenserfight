import React from 'react'

// ── FieldLabel ──────────────────────────────────────────────────────────────

export interface FieldLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const FieldLabel: React.FC<FieldLabelProps> = ({
  required,
  className = '',
  children,
  ...props
}) => (
  <label
    className={`block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1.5 ${className}`}
    {...props}
  >
    {children}
    {required && (
      <span className="ml-0.5 text-status-red" aria-hidden="true">*</span>
    )}
  </label>
)

FieldLabel.displayName = 'FieldLabel'

// ── FieldHint ───────────────────────────────────────────────────────────────

export interface FieldHintProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldHint: React.FC<FieldHintProps> = ({ className = '', children, ...props }) => (
  <p
    className={`mt-1 text-xs text-greyscale-500 dark:text-greyscale-500 ${className}`}
    {...props}
  >
    {children}
  </p>
)

FieldHint.displayName = 'FieldHint'

// ── FieldError ──────────────────────────────────────────────────────────────

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FieldError: React.FC<FieldErrorProps> = ({ className = '', children, ...props }) => {
  if (!children) return null
  return (
    <p
      role="alert"
      className={`mt-1.5 text-xs font-medium text-status-red ${className}`}
      {...props}
    >
      {children}
    </p>
  )
}

FieldError.displayName = 'FieldError'

// ── Field ────────────────────────────────────────────────────────────────────

export interface FieldProps {
  /** Rendered above the field control */
  label?: string
  /** Unique id — passed to htmlFor on label and id on the control */
  id?: string
  /** Whether the field is required */
  required?: boolean
  /** Error message — renders FieldError when non-empty */
  error?: string
  /** Helper text — renders FieldHint when provided */
  hint?: string
  children: React.ReactNode
  className?: string
}

/**
 * Composite form field wrapper: FieldLabel + control + FieldHint + FieldError.
 *
 * @example
 * <Field label="Username" id="username" required error={errors.username?.message}>
 *   <Input id="username" {...register('username')} />
 * </Field>
 */
export const Field: React.FC<FieldProps> = ({
  label,
  id,
  required,
  error,
  hint,
  children,
  className = '',
}) => (
  <div className={`flex flex-col ${className}`}>
    {label && (
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
    )}
    {children}
    {hint && !error && <FieldHint>{hint}</FieldHint>}
    {error && <FieldError id={id ? `${id}-error` : undefined}>{error}</FieldError>}
  </div>
)

Field.displayName = 'Field'
