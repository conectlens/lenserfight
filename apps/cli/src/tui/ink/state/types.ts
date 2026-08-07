export type ToastKind = 'info' | 'success' | 'warn' | 'error'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

export interface ConfirmRequest {
  id: string
  title: string
  description: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel?: () => void
}
