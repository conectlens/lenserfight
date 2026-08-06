import { render } from 'ink-testing-library'

import { _setCommandSuggestionsForTest } from '../dashboard'

import { _setOnboardingCompleteForTest } from './AppShell'
import { Dashboard } from './Dashboard'
import { _resetPersistedNavForTest } from './state/AppStateContext'

import type { DashboardData } from './useDashboardData'

// NOTE on why this file doesn't use jest.mock(): apps/cli's ink specs run
// under jest.ink.config.mjs, a native-ESM jest runtime (ink/ink-testing-
// library are ESM-only). jest.mock() relies on Babel-hoisting semantics that
// don't apply to real ES modules here, so the original Dashboard.spec.tsx
// this file replaces never used it either — it relied on props (pollMs/
// initialData) and test-only override hooks. Screens whose data isn't
// injectable via props (Home, the domain-list screens) call the real
// data-service/RPC layer here; every one of those calls degrades to an
// empty/error state (not a throw) when unauthenticated, which is exactly the
// state a sandboxed test run is in — so assertions below only check
// structure/navigation, never specific fetched content for those screens.
// DomainListScreen's own mechanics (fetch/sort/filter/actions) get direct,
// fully-injected coverage in screens/DomainListScreen.spec.tsx instead.

const DATA: DashboardData = {
  profile: 'default',
  healthy: true,
  logs: [],
  banner: null,
  recentCommands: [],
}

const flush = () => new Promise((r) => setTimeout(r, 20))

describe('Dashboard (AppShell)', () => {
  beforeEach(() => {
    _resetPersistedNavForTest()
    _setOnboardingCompleteForTest(true)
    _setCommandSuggestionsForTest([
      { cmd: 'battle list', desc: 'List recent battles' },
      { cmd: 'battle create', desc: 'Create a new battle' },
      { cmd: 'status', desc: 'Show overall system status' },
    ])
  })

  afterEach(() => {
    _setCommandSuggestionsForTest(null)
    _setOnboardingCompleteForTest(null)
  })

  it('renders the header and full sidebar on Home', async () => {
    const { lastFrame } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('profile default')
    expect(frame).toContain('healthy')
    expect(frame).toContain('Agents')
    expect(frame).toContain('Workflows')
    expect(frame).toContain('Approvals')
    expect(frame).toContain('Configuration')
  })

  it('shows the down indicator when unhealthy', async () => {
    const { lastFrame } = render(
      <Dashboard pollMs={null} initialData={{ ...DATA, healthy: false }} onAction={() => undefined} />,
    )
    await flush()
    expect(lastFrame() ?? '').toContain('down')
  })

  it('navigates to a section via the digit shortcut and updates the breadcrumb', async () => {
    const { lastFrame, stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)
    await flush()
    stdin.write('9') // 9 = Approvals, see DIGIT_JUMP in AppShell.tsx
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Approvals')
  })

  it('opens the raw command bar on ":" and dispatches the selected command', async () => {
    const actions: unknown[] = []
    const { stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={(a) => actions.push(a)} />)
    await flush()
    stdin.write(':')
    await flush()
    for (const ch of 'battle list') stdin.write(ch)
    await flush()
    stdin.write('\r')
    await flush()
    expect(actions).toContainEqual({ type: 'command', argv: ['battle', 'list'] })
  })

  it('opens the fuzzy palette on Ctrl+K and navigates to a matched section', async () => {
    const { lastFrame, stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)
    await flush()
    stdin.write('\x0b')
    await flush()
    for (const ch of 'Agents') stdin.write(ch)
    await flush()
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toContain('Agents')
  })

  it('toggles the help overlay on "?"', async () => {
    const { lastFrame, stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)
    await flush()
    stdin.write('?')
    await flush()
    expect(lastFrame() ?? '').toContain('Keyboard shortcuts')
  })

  it('quits on "q"', async () => {
    const actions: unknown[] = []
    const { stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={(a) => actions.push(a)} />)
    await flush()
    stdin.write('q')
    await flush()
    expect(actions).toContainEqual({ type: 'quit' })
  })

  it('quits with code 130 on Ctrl+C', async () => {
    const actions: unknown[] = []
    const { stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={(a) => actions.push(a)} />)
    await flush()
    stdin.write('\x03')
    await flush()
    expect(actions).toContainEqual({ type: 'quit', code: 130 })
  })
})
