import { render } from 'ink-testing-library'

import { ConfirmDialog } from './ConfirmDialog'

import type { ConfirmRequest } from '../state/types'

// This app's ink specs run under a native-ESM jest runtime where the `jest`
// global (and jest.fn()) isn't available at module scope — see the note in
// ../Dashboard.spec.tsx. A plain call-recording function stands in instead.
function spy() {
  const calls: unknown[][] = []
  const fn = (...args: unknown[]) => {
    calls.push(args)
  }
  fn.calls = calls
  return fn
}

function makeRequest(overrides: Partial<ConfirmRequest> = {}) {
  const onConfirm = spy()
  const onCancel = spy()
  const request: ConfirmRequest = {
    id: 'confirm-1',
    title: 'Delete schedule',
    description: 'This cannot be undone.',
    risk: 'HIGH',
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    onConfirm,
    onCancel,
    ...overrides,
  }
  return { request, onConfirm, onCancel }
}

const flush = () => new Promise((r) => setTimeout(r, 20))

describe('ConfirmDialog', () => {
  it('renders the title, description, and risk level', () => {
    const { request } = makeRequest()
    const { lastFrame } = render(<ConfirmDialog request={request} onResolve={() => undefined} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Delete schedule')
    expect(frame).toContain('This cannot be undone.')
    expect(frame).toContain('HIGH')
  })

  it('confirms on "y" and resolves', async () => {
    const { request, onConfirm, onCancel } = makeRequest()
    const resolved: string[] = []
    const { stdin } = render(<ConfirmDialog request={request} onResolve={(id) => resolved.push(id)} />)
    stdin.write('y')
    await flush()
    expect(onConfirm.calls).toHaveLength(1)
    expect(onCancel.calls).toHaveLength(0)
    expect(resolved).toEqual(['confirm-1'])
  })

  it('confirms on Enter', async () => {
    const { request, onConfirm } = makeRequest()
    const { stdin } = render(<ConfirmDialog request={request} onResolve={() => undefined} />)
    stdin.write('\r')
    await flush()
    expect(onConfirm.calls).toHaveLength(1)
  })

  it('cancels on "n" without confirming', async () => {
    const { request, onConfirm, onCancel } = makeRequest()
    const resolved: string[] = []
    const { stdin } = render(<ConfirmDialog request={request} onResolve={(id) => resolved.push(id)} />)
    stdin.write('n')
    await flush()
    expect(onConfirm.calls).toHaveLength(0)
    expect(onCancel.calls).toHaveLength(1)
    expect(resolved).toEqual(['confirm-1'])
  })

  it('cancels on Esc', async () => {
    const { request, onConfirm, onCancel } = makeRequest()
    const { stdin } = render(<ConfirmDialog request={request} onResolve={() => undefined} />)
    stdin.write('\x1b')
    await flush()
    expect(onConfirm.calls).toHaveLength(0)
    expect(onCancel.calls).toHaveLength(1)
  })
})
