interface AuthLoadingOverlayProps {
  message?: string
  isSuccess?: boolean
}

export function AuthLoadingOverlay({ message = 'Loading...', isSuccess = false }: AuthLoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(11,15,25,0.72)] px-4 backdrop-blur-md">
      <div className="flex min-w-72 flex-col items-center gap-3 rounded-3xl border border-white/10 bg-[rgba(17,23,35,0.92)] px-6 py-7 text-center text-white shadow-2xl">
        <span
          className={`h-10 w-10 animate-spin rounded-full border-4 ${
            isSuccess ? 'border-white/30 border-t-[var(--cl-status-green)]' : 'border-white/30 border-t-white'
          }`}
        />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  )
}
