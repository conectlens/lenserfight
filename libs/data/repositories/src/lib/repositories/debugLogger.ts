const isRepositoryDebugEnabled =
  !!import.meta.env.DEV && import.meta.env.VITE_ENABLE_REPOSITORY_DEBUG === 'true'

export function debugRepositoryEvent(
  scope: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isRepositoryDebugEnabled) return

  if (data) {
    console.debug(`[${scope}] ${message}`, data)
    return
  }

  console.debug(`[${scope}] ${message}`)
}
