import { toast } from 'sonner'

export function handleRateLimitError(err: unknown): void {
  const message =
    err instanceof Error ? err.message : typeof err === 'string' ? err : 'Too many requests'
  const isRateLimit =
    message.includes('429') ||
    message.toLowerCase().includes('rate limit') ||
    message.toLowerCase().includes('too many requests') ||
    (err as { code?: string })?.code === 'RATE_LIMIT'

  if (isRateLimit) {
    toast.error('Rate limit reached. Please wait a moment before trying again.')
  } else {
    toast.error(message)
  }
}
