import { render } from 'ink-testing-library'

import { _setCommandSuggestionsForTest } from '../dashboard'

import { Repl } from './Repl'

// This app's ink specs run under a native-ESM jest runtime where the `jest`
// global isn't available at module scope (see the note previously in
// Dashboard.spec.tsx) — a plain call-recording function stands in for jest.fn().
function spy() {
  const calls: unknown[][] = []
  const fn = (...args: unknown[]) => {
    calls.push(args)
  }
  fn.calls = calls
  return fn
}

const flush = () => new Promise((r) => setTimeout(r, 20))

// Deliberately never types a bare command name (e.g. "agents list") or
// "/status"/"/settings" in these specs — those paths call dispatchInProcess,
// which lazily imports ../main and would trigger main.ts's top-level
// runMain(process.argv) side effect inside the test process. Everything
// exercised here (typing/editing, history, meta commands that don't dispatch,
// overlays) is safe because it never reaches that import.

describe('Repl', () => {
  beforeEach(() => {
    _setCommandSuggestionsForTest([
      { cmd: 'agents', desc: 'Manage agents' },
      { cmd: 'agents list', desc: 'List agents' },
      { cmd: 'battle', desc: 'Manage battles' },
    ])
  })

  afterEach(() => {
    _setCommandSuggestionsForTest(null)
  })

  it('shows a welcome banner and the status line on mount', () => {
    const onQuit = spy()
    const { lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    const frame = lastFrame() ?? ''
    expect(frame).toContain('LenserFight CLI')
    expect(frame).toContain('profile')
    unmount()
  })

  it('echoes typed characters into the input line', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('agents')
    await flush()
    expect(lastFrame() ?? '').toContain('agents')
    unmount()
  })

  it('backspace removes the last character', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('agentsX')
    await flush()
    stdin.write('\x7f') // backspace
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('agents')
    expect(frame).not.toContain('agentsX')
    unmount()
  })

  it('quits via Ctrl+C when idle', async () => {
    const onQuit = spy()
    const { stdin, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('\x03')
    await flush()
    expect(onQuit.calls).toHaveLength(1)
    expect(onQuit.calls[0]).toEqual([0])
    unmount()
  })

  it('handles typing immediately followed by Enter with no yield in between (pasted-text scenario)', async () => {
    // Regression test: typing and Enter must not read a stale closure of the
    // input buffer when they arrive back-to-back with no render in between —
    // this is exactly what happens when a terminal delivers a pasted
    // "/debug\n"-shaped chunk as consecutive synchronous events. Before the
    // inputRef-mirrored functional-state fix, the Enter handler would read
    // an empty buffer here and silently no-op instead of toggling debug mode.
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('/debug')
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toMatch(/Debug mode ON/)
    unmount()
  })

  it('/clear writes a terminal clear-screen sequence', async () => {
    const onQuit = spy()
    const { stdin, unmount } = render(<Repl onQuit={onQuit} />)
    const originalWrite = process.stdout.write
    const writes: string[] = []
    process.stdout.write = ((chunk: unknown) => {
      writes.push(String(chunk))
      return true
    }) as typeof process.stdout.write
    try {
      stdin.write('/clear')
      await flush()
      stdin.write('\r')
      await flush()
    } finally {
      process.stdout.write = originalWrite
    }
    expect(writes.some((w) => w.includes('\x1b[2J'))).toBe(true)
    unmount()
  })

  it('/history lists recently typed commands', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('/clear')
    await flush()
    stdin.write('\r')
    await flush()
    stdin.write('/history')
    await flush()
    stdin.write('\r')
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('/clear')
    unmount()
  })

  it('/debug toggles debug mode and reports it', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('/debug')
    await flush()
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toMatch(/Debug mode ON/)
    unmount()
  })

  it('/help opens the shortcut overlay', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('/help')
    await flush()
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toContain('Keyboard shortcuts')
    unmount()
  })

  it('Ctrl+R opens reverse history search', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('\x12') // Ctrl+R
    await flush()
    expect(lastFrame() ?? '').toContain('reverse-search')
    unmount()
  })

  it('Ctrl+K opens the command palette', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('\x0b') // Ctrl+K
    await flush()
    expect(lastFrame() ?? '').toContain('search commands')
    unmount()
  })

  it('shows inline suggestions while typing a command name', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    stdin.write('agen')
    await flush()
    expect(lastFrame() ?? '').toContain('List agents')
    unmount()
  })

  it('does not submit on empty input', async () => {
    const onQuit = spy()
    const { stdin, lastFrame, unmount } = render(<Repl onQuit={onQuit} />)
    const before = lastFrame() ?? ''
    stdin.write('\r')
    await flush()
    expect(lastFrame() ?? '').toBe(before)
    unmount()
  })
})
