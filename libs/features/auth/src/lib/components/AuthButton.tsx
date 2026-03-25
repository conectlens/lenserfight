import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type AuthButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  isLoading?: boolean
}

export function AuthButton({ children, isLoading = false, className = '', disabled, ...props }: AuthButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cl-status-blue)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--cl-deep-600)] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : null}
      {children}
    </button>
  )
}
