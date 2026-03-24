import React from 'react'

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-gray-300 mb-1.5">
        {label}
      </label>
      <input
        className={`w-full px-4 py-2.5 rounded-lg border bg-[var(--surface-input)] dark:bg-gray-800 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] dark:text-white focus:ring-2 focus:ring-black/5 focus:border-[var(--text-primary)] transition-colors outline-none dark:placeholder-gray-500 ${error ? 'border-red-500 dark:border-red-500' : 'border-[var(--border-strong)] dark:border-gray-700'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
