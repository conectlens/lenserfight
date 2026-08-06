export type FocusRegion = 'sidebar' | 'workspace' | 'detail'

export type DomainId =
  | 'home'
  | 'agents'
  | 'workflows'
  | 'execute'
  | 'battles'
  | 'schedules'
  | 'memory'
  | 'lensers'
  | 'approvals'
  | 'configuration'
  | 'logs'

export interface ViewFrame {
  id: DomainId
  title: string
}

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

/** Per-domain UI state (selection, filter, sort, scroll) kept alive across remounts. */
export interface ScreenState {
  selectedIndex?: number
  detailOpen?: boolean
  filter?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  activeTab?: string
  [key: string]: unknown
}

export interface AppState {
  viewStack: ViewFrame[]
  focus: FocusRegion
  detailCollapsed: boolean
  toasts: Toast[]
  confirmQueue: ConfirmRequest[]
  screenState: Record<string, ScreenState>
}

export const HOME_FRAME: ViewFrame = { id: 'home', title: 'Home' }
