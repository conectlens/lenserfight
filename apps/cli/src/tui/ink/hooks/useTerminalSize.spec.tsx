import { Text } from 'ink'
import { render } from 'ink-testing-library'

import { computeBreakpoint, useTerminalSize } from './useTerminalSize'

describe('computeBreakpoint', () => {
  it('classifies narrow, standard, and wide widths', () => {
    expect(computeBreakpoint(80)).toBe('narrow')
    expect(computeBreakpoint(120)).toBe('standard')
    expect(computeBreakpoint(160)).toBe('wide')
  })
})

function Probe() {
  const size = useTerminalSize()
  return <Text>{`${size.columns}x${size.rows} ${size.breakpoint}`}</Text>
}

describe('useTerminalSize', () => {
  it('reads the current stdout dimensions on mount', () => {
    const { lastFrame } = render(<Probe />, { stdout: { columns: 100, rows: 30 } as unknown as NodeJS.WriteStream })
    expect(lastFrame()).toContain('standard')
  })
})
