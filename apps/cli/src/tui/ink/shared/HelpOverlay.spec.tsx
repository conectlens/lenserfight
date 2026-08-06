import { render } from 'ink-testing-library'

import { HelpOverlay } from './HelpOverlay'

const GLOBAL = [
  { keys: 'Ctrl+C', description: 'Quit immediately' },
  { keys: ':', description: 'Open raw command bar' },
]
const CONTEXTUAL = [
  { keys: 'p', description: 'Pause' },
  { keys: 'r', description: 'Resume' },
]

const flush = () => new Promise((r) => setTimeout(r, 20))

describe('HelpOverlay', () => {
  it('renders nothing when closed', () => {
    const { lastFrame } = render(
      <HelpOverlay open={false} onClose={() => undefined} globalShortcuts={GLOBAL} contextualShortcuts={CONTEXTUAL} contextLabel="Agents shortcuts" />,
    )
    expect(lastFrame()).toBe('')
  })

  it('lists global and contextual shortcuts when open', () => {
    const { lastFrame } = render(
      <HelpOverlay open onClose={() => undefined} globalShortcuts={GLOBAL} contextualShortcuts={CONTEXTUAL} contextLabel="Agents shortcuts" />,
    )
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Quit immediately')
    expect(frame).toContain('Agents shortcuts')
    expect(frame).toContain('Pause')
  })

  it('filters shortcuts as the user types', async () => {
    const { lastFrame, stdin } = render(
      <HelpOverlay open onClose={() => undefined} globalShortcuts={GLOBAL} contextualShortcuts={CONTEXTUAL} contextLabel="Agents shortcuts" />,
    )
    for (const ch of 'pause') stdin.write(ch)
    await flush()
    const frame = lastFrame() ?? ''
    expect(frame).toContain('Pause')
    expect(frame).not.toContain('Resume')
    expect(frame).not.toContain('Quit immediately')
  })

  it('closes on Esc', async () => {
    let closeCount = 0
    const { stdin } = render(
      <HelpOverlay
        open
        onClose={() => {
          closeCount += 1
        }}
        globalShortcuts={GLOBAL}
        contextualShortcuts={CONTEXTUAL}
        contextLabel="Agents shortcuts"
      />,
    )
    stdin.write('\x1b')
    await flush()
    expect(closeCount).toBe(1)
  })
})
