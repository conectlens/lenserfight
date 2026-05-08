import { toast } from 'sonner'
import { normalizeError } from '../normalize'

export interface ToastErrorOptions {
  redirectOnAuth?: boolean
  navigate?: (path: string) => void
  fallbackMessage?: string
}

export function useToast() {
  function toastError(error: unknown, options: ToastErrorOptions = {}) {
    const normalized = normalizeError(error)
    const message = options.fallbackMessage ?? normalized.message

    if (normalized.kind === 'constraint_violation') {
      toast.warning(message)
    } else {
      toast.error(message)
    }

    if (normalized.kind === 'unauthorized' && options.redirectOnAuth && options.navigate) {
      const nav = options.navigate
      setTimeout(() => nav('/auth/login'), 2000)
    }
  }

  return {
    toastError,
    toastSuccess: (msg: string) => toast.success(msg),
    toastInfo: (msg: string) => toast.info(msg),
    toastWarning: (msg: string) => toast.warning(msg),
  }
}
