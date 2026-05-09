import { getExecContext } from '../lib/exec-context'

// ANSI codes — no external deps required
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const GRAY = '\x1b[90m'
const BG_BLACK = '\x1b[40m'

type CliErrorKind = 'unauthorized' | 'network' | 'unknown'

interface CliError {
  kind: CliErrorKind
  message: string
  detail?: string
}

function classify(error: unknown): CliError {
  if (!error || typeof error !== 'object') {
    return { kind: 'unknown', message: String(error) }
  }

  const e = error as Record<string, unknown>
  const msg = typeof e['message'] === 'string' ? e['message'] : ''
  const code = typeof e['code'] === 'string' ? e['code'] : ''

  if (
    e['status'] === 401 ||
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    msg.toLowerCase().includes('jwt') ||
    msg.toLowerCase().includes('unauthorized') ||
    msg.toLowerCase().includes('not authenticated')
  ) {
    return {
      kind: 'unauthorized',
      message: 'ACCESS DENIED',
      detail: 'You do not have permission to access this resource.\nAuthenticate and try again.',
    }
  }

  if (error instanceof TypeError && msg.toLowerCase().includes('fetch')) {
    return {
      kind: 'network',
      message: 'NETWORK FAILURE',
      detail: 'Could not reach the remote endpoint.\nCheck connectivity and retry.',
    }
  }

  return {
    kind: 'unknown',
    message: 'ERROR',
    detail: msg || 'An unexpected error occurred.',
  }
}

function separator(): string {
  return `${GRAY}${'─'.repeat(50)}${RESET}`
}

export function reportCliError(error: unknown): void {
  const { message, detail, kind } = classify(error)

  const color = kind === 'unauthorized' ? RED : kind === 'network' ? YELLOW : GRAY

  process.stderr.write('\n')
  process.stderr.write(`${BG_BLACK}${color}${BOLD} ${message} ${RESET}\n`)
  process.stderr.write(`${separator()}\n`)

  if (detail) {
    for (const line of detail.split('\n')) {
      process.stderr.write(`${DIM}  ${line}${RESET}\n`)
    }
  }

  const { isDebug } = getExecContext()
  if (isDebug && error instanceof Error && error.stack) {
    process.stderr.write(`${DIM}  Stack trace:${RESET}\n`)
    for (const line of error.stack.split('\n').slice(1)) {
      process.stderr.write(`${GRAY}  ${line}${RESET}\n`)
    }
  }

  process.stderr.write(`${separator()}\n\n`)
}

export function exitWithError(error: unknown): never {
  reportCliError(error)
  process.exit(1)
}
