import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'

import { HOME_FRAME } from './types'

import type { AppState, ConfirmRequest, DomainId, FocusRegion, ScreenState, Toast, ViewFrame } from './types'

// The dashboard's outer loop (../../dashboard.ts) unmounts and re-mounts the
// whole ink tree after every dispatched command so panels re-fetch fresh data
// (see runDashboard()). Navigation/filter/selection state would otherwise
// reset on every command run, which fails the "uninterrupted state when
// switching views" requirement — so the parts of AppState that represent
// "where the user is" are mirrored into this module-level object (survives
// remounts within the same process, reset only on process exit) rather than
// living purely in React state. Transient UI (palette/help/confirm/toasts)
// intentionally is NOT persisted here — it's meaningless across a command
// dispatch, since dispatching one is what closes the palette/confirm anyway.
interface PersistedNav {
  viewStack: ViewFrame[]
  screenState: Record<string, ScreenState>
  detailCollapsed: boolean
}

const persisted: PersistedNav = {
  viewStack: [HOME_FRAME],
  screenState: {},
  detailCollapsed: false,
}

/** Test-only: reset persisted navigation state between specs. */
export function _resetPersistedNavForTest(): void {
  persisted.viewStack = [HOME_FRAME]
  persisted.screenState = {}
  persisted.detailCollapsed = false
}

type Action =
  | { type: 'NAVIGATE'; view: ViewFrame }
  | { type: 'PUSH'; view: ViewFrame }
  | { type: 'BACK' }
  | { type: 'SET_FOCUS'; focus: FocusRegion }
  | { type: 'TOGGLE_DETAIL_COLLAPSED' }
  | { type: 'PUSH_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'ENQUEUE_CONFIRM'; request: ConfirmRequest }
  | { type: 'RESOLVE_CONFIRM'; id: string }
  | { type: 'SET_SCREEN_STATE'; domain: DomainId; patch: ScreenState }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, viewStack: [action.view], focus: 'workspace' }
    case 'PUSH':
      return { ...state, viewStack: [...state.viewStack, action.view], focus: 'workspace' }
    case 'BACK':
      return state.viewStack.length > 1
        ? { ...state, viewStack: state.viewStack.slice(0, -1) }
        : state
    case 'SET_FOCUS':
      return { ...state, focus: action.focus }
    case 'TOGGLE_DETAIL_COLLAPSED':
      return { ...state, detailCollapsed: !state.detailCollapsed }
    case 'PUSH_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast].slice(-4) }
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) }
    case 'ENQUEUE_CONFIRM':
      return { ...state, confirmQueue: [...state.confirmQueue, action.request] }
    case 'RESOLVE_CONFIRM':
      return { ...state, confirmQueue: state.confirmQueue.filter((c) => c.id !== action.id) }
    case 'SET_SCREEN_STATE': {
      const prev = state.screenState[action.domain] ?? {}
      return { ...state, screenState: { ...state.screenState, [action.domain]: { ...prev, ...action.patch } } }
    }
    default:
      return state
  }
}

function initState(): AppState {
  return {
    viewStack: persisted.viewStack,
    focus: 'sidebar',
    detailCollapsed: persisted.detailCollapsed,
    toasts: [],
    confirmQueue: [],
    screenState: persisted.screenState,
  }
}

interface AppStateContextValue {
  state: AppState
  navigateTo: (view: ViewFrame) => void
  pushView: (view: ViewFrame) => void
  goBack: () => boolean
  toggleDetailCollapsed: () => void
  pushToast: (kind: Toast['kind'], message: string) => void
  dismissToast: (id: string) => void
  requestConfirm: (request: Omit<ConfirmRequest, 'id'>) => void
  resolveConfirm: (id: string) => void
  setFocus: (focus: FocusRegion) => void
  getScreenState: (domain: DomainId) => ScreenState
  setScreenState: (domain: DomainId, patch: ScreenState) => void
  currentView: ViewFrame
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

let toastSeq = 0
let confirmSeq = 0

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  useEffect(() => {
    persisted.viewStack = state.viewStack
    persisted.screenState = state.screenState
    persisted.detailCollapsed = state.detailCollapsed
  }, [state.viewStack, state.screenState, state.detailCollapsed])

  const navigateTo = useCallback((view: ViewFrame) => dispatch({ type: 'NAVIGATE', view }), [])
  const pushView = useCallback((view: ViewFrame) => dispatch({ type: 'PUSH', view }), [])
  const goBack = useCallback(() => {
    if (persisted.viewStack.length <= 1) return false
    dispatch({ type: 'BACK' })
    return true
  }, [])
  const toggleDetailCollapsed = useCallback(() => dispatch({ type: 'TOGGLE_DETAIL_COLLAPSED' }), [])
  const pushToast = useCallback((kind: Toast['kind'], message: string) => {
    dispatch({ type: 'PUSH_TOAST', toast: { id: `toast-${++toastSeq}`, kind, message } })
  }, [])
  const dismissToast = useCallback((id: string) => dispatch({ type: 'DISMISS_TOAST', id }), [])
  const requestConfirm = useCallback((request: Omit<ConfirmRequest, 'id'>) => {
    dispatch({ type: 'ENQUEUE_CONFIRM', request: { ...request, id: `confirm-${++confirmSeq}` } })
  }, [])
  const resolveConfirm = useCallback((id: string) => dispatch({ type: 'RESOLVE_CONFIRM', id }), [])
  const setFocus = useCallback((focus: FocusRegion) => dispatch({ type: 'SET_FOCUS', focus }), [])
  const getScreenState = useCallback(
    (domain: DomainId) => state.screenState[domain] ?? {},
    [state.screenState],
  )
  const setScreenState = useCallback((domain: DomainId, patch: ScreenState) => {
    dispatch({ type: 'SET_SCREEN_STATE', domain, patch })
  }, [])

  const currentView = state.viewStack[state.viewStack.length - 1] ?? HOME_FRAME

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      navigateTo,
      pushView,
      goBack,
      toggleDetailCollapsed,
      pushToast,
      dismissToast,
      requestConfirm,
      resolveConfirm,
      setFocus,
      getScreenState,
      setScreenState,
      currentView,
    }),
    [
      state,
      navigateTo,
      pushView,
      goBack,
      toggleDetailCollapsed,
      pushToast,
      dismissToast,
      requestConfirm,
      resolveConfirm,
      setFocus,
      getScreenState,
      setScreenState,
      currentView,
    ],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
