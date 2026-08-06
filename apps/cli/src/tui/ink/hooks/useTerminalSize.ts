import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

export type Breakpoint = 'narrow' | 'standard' | 'wide'

export interface TerminalSize {
  columns: number
  rows: number
  breakpoint: Breakpoint
}

export function computeBreakpoint(columns: number): Breakpoint {
  if (columns < 100) return 'narrow'
  if (columns < 140) return 'standard'
  return 'wide'
}

function readSize(stdout: NodeJS.WriteStream | undefined): TerminalSize {
  const columns = stdout?.columns ?? 80
  const rows = stdout?.rows ?? 24
  return { columns, rows, breakpoint: computeBreakpoint(columns) }
}

/** Reactive terminal dimensions + responsive breakpoint, updated on resize. */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout()
  const [size, setSize] = useState<TerminalSize>(() => readSize(stdout))

  useEffect(() => {
    if (!stdout) return
    const onResize = () => setSize(readSize(stdout))
    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  return size
}
