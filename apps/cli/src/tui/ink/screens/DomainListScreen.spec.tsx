import { render } from 'ink-testing-library'

import { ConfirmDialog } from '../shared/ConfirmDialog'
import { AppStateProvider, useAppState, _resetPersistedNavForTest } from '../state/AppStateContext'

import { DomainListScreen } from './DomainListScreen'

import type { DomainListConfig } from './domainScreenConfigs'

// DomainListScreen is the shared engine behind six of the ten dashboard
// sections (Agents, Approvals, Schedules, Memory, Lensers, Logs) — so rather
// than duplicate this flow test per real domain (which would also require
// mocking the RPC layer, awkward under this app's ESM ink-spec runtime, see
// the note in ../Dashboard.spec.tsx), this drives the mechanism directly
// with a fully-injected fake config: list renders -> select -> detail opens
// -> action triggers a confirm dialog -> confirming dispatches the argv.
// Real per-domain wiring (columns/fetchers/RPC argv) lives in
// domainScreenConfigs.ts and is exercised end-to-end via Dashboard.spec.tsx's
// digit-navigation test.

interface Widget {
  id: string
  name: string
  status: string
}

function makeConfig(): DomainListConfig {
  return {
    id: 'agents',
    title: 'Widgets',
    columns: [
      { key: 'name', label: 'NAME', width: 12 },
      { key: 'status', label: 'STATUS', width: 10, status: true },
    ],
    fetch: async (): Promise<Widget[]> => [
      { id: '1', name: 'Alpha', status: 'active' },
      { id: '2', name: 'Beta', status: 'paused' },
    ],
    rowId: (row) => row.id,
    toCells: (row) => ({ name: row.name, status: row.status }),
    detailFields: [{ label: 'Name', get: (row) => row.name }],
    emptyMessage: 'No widgets.',
    actions: [
      {
        key: 'p',
        label: 'Pause',
        visible: (row) => row.status === 'active',
        buildArgv: (row) => ['widget', 'pause', row.id],
        confirm: {
          title: 'Pause widget',
          description: (row) => `Pause ${row.name}?`,
          risk: 'MEDIUM',
          confirmLabel: 'Pause',
        },
      },
    ],
  }
}

function Harness({ config, onDispatch }: { config: DomainListConfig; onDispatch: (argv: string[]) => void }) {
  return (
    <AppStateProvider>
      <HarnessInner config={config} onDispatch={onDispatch} />
    </AppStateProvider>
  )
}

function HarnessInner({ config, onDispatch }: { config: DomainListConfig; onDispatch: (argv: string[]) => void }) {
  const { state, resolveConfirm } = useAppState()
  const confirm = state.confirmQueue[0] ?? null
  return (
    <>
      <DomainListScreen config={config} focused={!confirm} width={80} showDetail onDispatch={onDispatch} />
      {confirm ? <ConfirmDialog request={confirm} onResolve={resolveConfirm} /> : null}
    </>
  )
}

const flush = () => new Promise((r) => setTimeout(r, 20))

describe('DomainListScreen', () => {
  beforeEach(() => {
    _resetPersistedNavForTest()
  })

  it('fetches and renders rows', async () => {
    const { lastFrame } = render(<Harness config={makeConfig()} onDispatch={() => undefined} />)
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Alpha')
    expect(frame).toContain('Beta')
  })

  it('filters rows with "/"', async () => {
    const { lastFrame, stdin } = render(<Harness config={makeConfig()} onDispatch={() => undefined} />)
    await flush()
    stdin.write('/')
    await flush()
    for (const ch of 'beta') stdin.write(ch)
    await flush()
    stdin.write('\r')
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Beta')
    expect(frame).not.toContain('Alpha')
  })

  it('opens the detail panel on Enter', async () => {
    const { lastFrame, stdin } = render(<Harness config={makeConfig()} onDispatch={() => undefined} />)
    await flush()
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toContain('Name: Alpha')
  })

  it('shows the redacted raw view with "v" once detail is open', async () => {
    const { lastFrame, stdin } = render(<Harness config={makeConfig()} onDispatch={() => undefined} />)
    await flush()
    stdin.write('\r')
    await flush()
    stdin.write('v')
    await flush()
    expect(lastFrame() ?? '').toContain('raw (redacted)')
  })

  it('runs a row action through a confirm dialog before dispatching', async () => {
    const dispatched: string[][] = []
    const { lastFrame, stdin } = render(<Harness config={makeConfig()} onDispatch={(argv) => dispatched.push(argv)} />)
    await flush()

    stdin.write('p')
    await flush()
    expect(lastFrame() ?? '').toContain('Pause widget')
    expect(dispatched).toHaveLength(0)

    stdin.write('y')
    await flush()
    expect(dispatched).toEqual([['widget', 'pause', '1']])
  })

  it('cancelling the confirm dialog does not dispatch', async () => {
    const dispatched: string[][] = []
    const { stdin } = render(<Harness config={makeConfig()} onDispatch={(argv) => dispatched.push(argv)} />)
    await flush()
    stdin.write('p')
    await flush()
    stdin.write('n')
    await flush()
    expect(dispatched).toHaveLength(0)
  })

  it('shows the empty state when the fetch resolves with no rows', async () => {
    const config = { ...makeConfig(), fetch: async () => [] }
    const { lastFrame } = render(<Harness config={config} onDispatch={() => undefined} />)
    await flush()
    expect(lastFrame() ?? '').toContain('No widgets.')
  })

  it('shows a recoverable error state when the fetch rejects', async () => {
    const config = { ...makeConfig(), fetch: async () => { throw new Error('boom') } }
    const { lastFrame } = render(<Harness config={config} onDispatch={() => undefined} />)
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('boom')
    expect(frame).toContain('Press r to retry.')
  })
})
