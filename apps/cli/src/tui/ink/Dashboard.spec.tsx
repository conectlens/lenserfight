import { render } from 'ink-testing-library'
import { Dashboard } from './Dashboard'
import type { DashboardData } from './useDashboardData'
import { _setCommandSuggestionsForTest } from '../dashboard'

// Pre-fetched data + pollMs=null means the component never touches the network,
// so no fetcher mocks are required.
const DATA: DashboardData = {
  profile: 'default',
  healthy: true,
  logs: [
    {
      action_type: 'ai.tool_invoke',
      payload: { tool: 'search' },
      created_at: '2026-05-08T00:00:00Z',
    },
  ],
  banner: null,
  recentCommands: [],
}

const flush = () => new Promise((r) => setTimeout(r, 20))

describe('ink Dashboard', () => {
  beforeEach(() => {
    // Seed a small, fixed suggestion set instead of walking the real command
    // tree via buildCommandInventory() — keeps the spec fast and deterministic.
    _setCommandSuggestionsForTest([
      { cmd: 'battle list', desc: 'List recent battles' },
      { cmd: 'battle create', desc: 'Create a new battle' },
      { cmd: 'battle view', desc: 'View battle details' },
      { cmd: 'schedule list', desc: 'List workflow schedules' },
      { cmd: 'status', desc: 'Show overall system status' },
    ])
  })

  afterEach(() => {
    _setCommandSuggestionsForTest(null)
  })

  it('renders the core panels (brand, health, logs, key bindings)', () => {
    const { lastFrame } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('LenserFight')
    expect(frame).toContain('HEALTHY')
    expect(frame).toContain('Recent agent logs')
    expect(frame).toContain('ai.tool_invoke')
    // key-binding hints
    expect(frame).toContain('agents')
    expect(frame).toContain('command')
  })

  it('shows the DOWN pill when unhealthy', () => {
    const { lastFrame } = render(
      <Dashboard pollMs={null} initialData={{ ...DATA, healthy: false }} onAction={() => undefined} />,
    )
    expect(lastFrame() ?? '').toContain('DOWN')
  })

  it('renders recent dispatched commands when present', () => {
    const { lastFrame } = render(
      <Dashboard
        pollMs={null}
        initialData={{
          ...DATA,
          recentCommands: [{ argv: ['battle', 'list'], code: 0, timestamp: 1 }],
        }}
        onAction={() => undefined}
      />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Recent commands')
    expect(frame).toContain('lf battle list')
  })

  it('opens the command bar on ":" and filters suggestions as the user types', async () => {
    const { lastFrame, stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={() => undefined} />)

    stdin.write(':')
    await flush()
    expect(lastFrame() ?? '').toContain('Enter to run')

    for (const ch of 'battle') stdin.write(ch)
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('battle')
    // a non-matching command group must not appear in the filtered list
    expect(frame).not.toContain('schedule list')
  })

  it('emits a command action when a valid command is submitted', async () => {
    const actions: unknown[] = []
    const { stdin } = render(<Dashboard pollMs={null} initialData={DATA} onAction={(a) => actions.push(a)} />)

    stdin.write(':')
    await flush()
    for (const ch of 'battle list') stdin.write(ch)
    await flush()
    stdin.write('\r')
    await flush()

    expect(actions).toContainEqual({ type: 'command', argv: ['battle', 'list'] })
  })

  it('shows a "not yet implemented" notice for a domain quick-key instead of drilling in', async () => {
    const actions: unknown[] = []
    const { lastFrame, stdin } = render(
      <Dashboard pollMs={null} initialData={DATA} onAction={(a) => actions.push(a)} />,
    )
    stdin.write('g')
    await flush()
    expect(actions).toHaveLength(0)
    expect(lastFrame() ?? '').toContain("aren't implemented in this build yet")
  })
})
