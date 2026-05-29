import { spawn } from 'node:child_process'
import { A, sym } from '../utils/ansi'
import { hackBanner } from '../lib/terminal-fx'

const RETURN_KEYS = new Set(['q', 'Q', '\x1b', '\r', '\n'])

function waitForReturnKey(): Promise<void> {
  return new Promise((resolve) => {
    try {
      process.stdin.setRawMode(true)
    } catch {
      /* ignore */
    }
    const onData = (buf: Buffer | string) => {
      const key = buf.toString()
      if (key === '\x03') {
        process.stdin.off('data', onData)
        process.exit(130)
      }
      if (RETURN_KEYS.has(key)) {
        process.stdin.off('data', onData)
        resolve()
      }
    }
    process.stdin.on('data', onData)
  })
}

/** Spawn `lf <argv>` with optional Mr. Robot–style prelude (dashboard). */
export function runChild(argv: string[], opts?: { fx?: boolean; label?: string }): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(A.showCursor + A.clearScreen + A.homeCursor)
    const label = opts?.label ?? argv.join(' ')
    if (opts?.fx !== false) {
      for (const line of hackBanner(label)) {
        process.stdout.write(line + '\n')
      }
    }
    process.stdout.write(`\n  ${A.bold}${A.brightCyan}${sym.run}  lf ${argv.join(' ')}${A.reset}\n\n`)

    const child = spawn('lf', argv, { stdio: 'inherit' })
    child.on('exit', () => {
      process.stdout.write(
        `\n  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} / ${A.brightYellow}Enter${A.reset}${A.gray} to return…${A.reset}\n`,
      )
      void waitForReturnKey().then(resolve)
    })
    child.on('error', () => {
      process.stdout.write(
        `\n  ${A.brightRed}${sym.fail}  could not spawn lf — is it on PATH?${A.reset}\n`,
      )
      process.stdout.write(`  ${A.gray}Press ${A.brightYellow}q${A.reset}${A.gray} to return.${A.reset}\n`)
      void waitForReturnKey().then(resolve)
    })
  })
}
