import { Box, Text, useInput } from 'ink'
import { useMemo, useState } from 'react'

import { loadOnboardingSnapshot } from '../../lib/onboarding/state'

import { CommandPalette, type CommandPaletteMode } from './CommandPalette'
import { useMouseTracking } from './hooks/useMouseTracking'
import { useTerminalSize } from './hooks/useTerminalSize'
import { BattleScreen } from './screens/BattleScreen'
import { ConfigurationScreen } from './screens/ConfigurationScreen'
import { DomainListScreen } from './screens/DomainListScreen'
import { getDomainListConfig } from './screens/domainScreenConfigs'
import { ExecuteScreen } from './screens/ExecuteScreen'
import { HomeScreen } from './screens/HomeScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { WorkflowsScreen } from './screens/WorkflowsScreen'
import { Breadcrumbs } from './shared/Breadcrumbs'
import { ConfirmDialog } from './shared/ConfirmDialog'
import { HelpOverlay, type ShortcutEntry } from './shared/HelpOverlay'
import { Sidebar, SIDEBAR_ITEMS } from './shared/Sidebar'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import { HOME_FRAME, type DomainId, type ViewFrame } from './state/types'
import { useDashboardData, type DashboardData } from './useDashboardData'

export type DashboardAction = { type: 'quit'; code?: number } | { type: 'command'; argv: string[] }

// This codebase's ESM ink-spec runtime (jest.ink.config.mjs) can't use
// jest.mock() the normal way (see the module-scope note in Dashboard.spec.tsx
// for why), so — same pattern as _setCommandSuggestionsForTest in
// ../dashboard.ts — tests bypass the real (disk-reading) onboarding check
// through this override instead of mocking the module.
let onboardingCompleteOverride: boolean | null = null
export function _setOnboardingCompleteForTest(value: boolean | null): void {
  onboardingCompleteOverride = value
}

interface AppShellProps {
  onAction: (action: DashboardAction) => void
  interactive?: boolean
  pollMs?: number | null
  initialData?: DashboardData
}

const DIGIT_JUMP: DomainId[] = [
  'home',
  'agents',
  'workflows',
  'execute',
  'battles',
  'schedules',
  'memory',
  'lensers',
  'approvals',
]

const GLOBAL_SHORTCUTS: ShortcutEntry[] = [
  { keys: 'Ctrl+C', description: 'Quit immediately' },
  { keys: 'q', description: 'Quit' },
  { keys: '1-9', description: 'Jump to Home / Agents / Workflows / Execute / Battles / Schedules / Memory / Lensers / Approvals' },
  { keys: 'Tab', description: 'Cycle focus: sidebar → workspace' },
  { keys: '↑/↓ (sidebar)', description: 'Move sidebar selection' },
  { keys: 'Enter (sidebar)', description: 'Open highlighted section' },
  { keys: 'letter (sidebar)', description: 'Jump directly to a section' },
  { keys: ':', description: 'Open raw command bar' },
  { keys: 'Ctrl+K', description: 'Open fuzzy command palette' },
  { keys: '?', description: 'Toggle this help' },
  { keys: 'Esc', description: 'Back / close panel' },
]

function screenShortcuts(id: DomainId): ShortcutEntry[] {
  if (id === 'home') {
    return [
      { keys: 'r', description: 'Refresh' },
      { keys: 'a / s / e', description: 'Jump to Approvals / Schedules / Execute' },
    ]
  }
  const config = getDomainListConfig(id)
  if (config) {
    return [
      { keys: '↑/↓', description: 'Move selection' },
      { keys: '/', description: 'Filter' },
      { keys: 's / S', description: 'Sort column / reverse' },
      { keys: '[ / ]', description: 'Previous / next page' },
      { keys: 'Enter', description: 'Open detail' },
      { keys: 'v', description: 'Toggle raw JSON (in detail)' },
      ...config.actions.map((a) => ({ keys: a.key, description: a.label })),
    ]
  }
  return [{ keys: '↑/↓', description: 'Move selection' }, { keys: 'r', description: 'Refresh' }]
}

function AppShellInner({ onAction, interactive = true, pollMs, initialData }: AppShellProps) {
  const poll = pollMs === undefined ? (interactive ? 2000 : null) : pollMs
  const dashboardData = useDashboardData(poll, initialData)
  const { state, navigateTo, goBack, setFocus, resolveConfirm, currentView } = useAppState()
  const size = useTerminalSize()

  const [sidebarHighlight, setSidebarHighlight] = useState(() =>
    Math.max(0, SIDEBAR_ITEMS.findIndex((i) => i.id === currentView.id)),
  )
  const [paletteMode, setPaletteMode] = useState<CommandPaletteMode>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [textInputActive, setTextInputActive] = useState(false)
  const [onboardingDone, setOnboardingDone] = useState(() => {
    if (onboardingCompleteOverride !== null) return onboardingCompleteOverride
    const snapshot = loadOnboardingSnapshot()
    return snapshot?.status === 'complete'
  })

  const showDetail = size.breakpoint !== 'narrow'
  const sidebarCollapsed = size.breakpoint === 'narrow'
  const activeConfirm = state.confirmQueue[0] ?? null
  const overlayActive = paletteMode !== null || helpOpen || !!activeConfirm
  const screenFocused = state.focus === 'workspace' && !overlayActive
  const sidebarFocused = state.focus === 'sidebar' && !overlayActive

  useMouseTracking(!overlayActive && !textInputActive, ({ y }) => {
    const relativeRow = y - 2
    if (relativeRow >= 0 && relativeRow < SIDEBAR_ITEMS.length) {
      const item = SIDEBAR_ITEMS[relativeRow]
      setSidebarHighlight(relativeRow)
      navigateTo({ id: item.id, title: item.label })
      setFocus('workspace')
    }
  })

  const dispatchCommand = (argv: string[]) => onAction({ type: 'command', argv })

  // Always-on hard-quit — never gated, matches the original single-screen dashboard's Ctrl+C behavior.
  useInput((input, key) => {
    if (key.ctrl && input === 'c') onAction({ type: 'quit', code: 130 })
  })

  useInput(
    (input, key) => {
      if (key.escape) {
        const item = SIDEBAR_ITEMS.find((i) => i.id === currentView.id)
        if (item) setSidebarHighlight(Math.max(0, SIDEBAR_ITEMS.indexOf(item)))
        if (!goBack()) onAction({ type: 'quit' })
        return
      }
      if (input === 'q' || input === 'Q') {
        onAction({ type: 'quit' })
        return
      }
      if (input === ':') {
        setPaletteMode('raw')
        return
      }
      if (key.ctrl && input === 'k') {
        setPaletteMode('fuzzy')
        return
      }
      if (input === '?') {
        setHelpOpen((v) => !v)
        return
      }
      const digit = Number(input)
      if (!Number.isNaN(digit) && digit >= 1 && digit <= DIGIT_JUMP.length) {
        const id = DIGIT_JUMP[digit - 1]
        const item = SIDEBAR_ITEMS.find((i) => i.id === id)
        if (item) {
          navigateTo({ id: item.id, title: item.label })
          setSidebarHighlight(SIDEBAR_ITEMS.indexOf(item))
          setFocus('workspace')
        }
        return
      }
      if (key.tab) {
        setFocus(state.focus === 'sidebar' ? 'workspace' : 'sidebar')
        return
      }
      if (state.focus === 'sidebar') {
        if (key.upArrow) {
          setSidebarHighlight((i) => Math.max(0, i - 1))
          return
        }
        if (key.downArrow) {
          setSidebarHighlight((i) => Math.min(SIDEBAR_ITEMS.length - 1, i + 1))
          return
        }
        if (key.return) {
          const item = SIDEBAR_ITEMS[sidebarHighlight]
          navigateTo({ id: item.id, title: item.label })
          setFocus('workspace')
          return
        }
        const match = SIDEBAR_ITEMS.find((i) => i.key === input)
        if (match) {
          navigateTo({ id: match.id, title: match.label })
          setSidebarHighlight(SIDEBAR_ITEMS.indexOf(match))
          setFocus('workspace')
        }
      }
    },
    { isActive: !overlayActive && !textInputActive },
  )

  const contentWidth = Math.max(40, size.columns - (sidebarCollapsed ? 6 : 24))

  const screen = useMemo(() => {
    const id = currentView.id
    if (id === 'home') {
      return (
        <HomeScreen
          focused={screenFocused}
          width={contentWidth}
          onNavigate={(target) => navigateTo({ id: target, title: SIDEBAR_ITEMS.find((i) => i.id === target)?.label ?? target })}
        />
      )
    }
    if (id === 'execute') return <ExecuteScreen focused={screenFocused} width={contentWidth} showDetail={showDetail} />
    if (id === 'workflows') return <WorkflowsScreen focused={screenFocused} width={contentWidth} showDetail={showDetail} />
    if (id === 'battles') return <BattleScreen focused={screenFocused} width={contentWidth} showDetail={showDetail} />
    if (id === 'configuration') return <ConfigurationScreen focused={screenFocused} width={contentWidth} onDispatch={dispatchCommand} />
    const config = getDomainListConfig(id)
    if (config) {
      return (
        <DomainListScreen
          config={config}
          focused={screenFocused}
          width={contentWidth}
          showDetail={showDetail}
          onDispatch={dispatchCommand}
          onInputModeChange={setTextInputActive}
        />
      )
    }
    return <Text color="gray">Nothing here yet.</Text>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView.id, screenFocused, contentWidth, showDetail])

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Breadcrumbs trail={currentView.id === 'home' ? [currentView] : [HOME_FRAME, currentView]} />
        <Text>
          <Text color="gray">profile {dashboardData.profile}  {'│'}  </Text>
          <Text color={dashboardData.healthy ? 'greenBright' : 'redBright'} bold>
            {dashboardData.healthy ? '● healthy' : '● down'}
          </Text>
        </Text>
      </Box>
      {dashboardData.banner ? (
        <Box>
          <Text dimColor>{dashboardData.banner}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Sidebar activeId={currentView.id} focused={sidebarFocused} collapsed={sidebarCollapsed} highlight={sidebarHighlight} />
        <Box marginLeft={1} flexDirection="column" width={contentWidth}>
          {screen}
        </Box>
      </Box>
      <CommandPalette
        mode={paletteMode}
        onClose={() => setPaletteMode(null)}
        onDispatch={(argv) => {
          setPaletteMode(null)
          dispatchCommand(argv)
        }}
        onNavigate={(view: ViewFrame) => {
          setPaletteMode(null)
          navigateTo(view)
          setFocus('workspace')
        }}
      />
      <HelpOverlay
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        globalShortcuts={GLOBAL_SHORTCUTS}
        contextualShortcuts={screenShortcuts(currentView.id)}
        contextLabel={`${currentView.title} shortcuts`}
      />
      {activeConfirm ? <ConfirmDialog request={activeConfirm} onResolve={resolveConfirm} /> : null}
    </Box>
  )
}

export function AppShell(props: AppShellProps) {
  return (
    <AppStateProvider>
      <AppShellInner {...props} />
    </AppStateProvider>
  )
}
