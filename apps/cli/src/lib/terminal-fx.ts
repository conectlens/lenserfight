/**
 * Terminal visuals for long-running CLI operations (dashboard + execute wait/stream).
 * Pure helpers are testable without a TTY.
 */

import { A } from '../utils/ansi'

const GLITCH_CHARS = '█▓▒░╔╗╚╝║═@#$%&*01'

export function glitchLine(seed: string, width = 48): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  let out = ''
  for (let i = 0; i < width; i++) {
    hash = (hash * 1103515245 + 12345) | 0
    const idx = Math.abs(hash) % GLITCH_CHARS.length
    out += GLITCH_CHARS[idx]
  }
  return `${A.brightGreen}${out}${A.reset}`
}

export function hackBanner(title: string): string[] {
  const line = glitchLine(title, 56)
  return [
    '',
    `  ${A.brightGreen}${A.bold}fsociety${A.reset}${A.gray} // ${A.reset}${A.brightCyan}${title}${A.reset}`,
    `  ${line}`,
    `  ${A.dim}root@lenserfight:${A.reset}${A.brightWhite}~/execute${A.reset}${A.dim} # awaiting payload…${A.reset}`,
    '',
  ]
}

export function streamTokenLine(provider: string, chunk: string): string {
  const preview = chunk.replace(/\s+/g, ' ').slice(0, 120)
  return `${A.gray}[${provider}]${A.reset} ${A.brightGreen}${preview}${A.reset}`
}

export function progressFrame(label: string, tick: number, width = 24): string {
  const filled = tick % (width + 1)
  const bar =
    `${A.brightGreen}${'█'.repeat(filled)}${A.reset}` +
    `${A.gray}${'░'.repeat(Math.max(0, width - filled))}${A.reset}`
  return `  ${A.brightCyan}${label}${A.reset} ${bar} ${A.dim}${String(tick).padStart(4)}${A.reset}`
}

export type SpinnerHandle = { stop: (final?: string) => void }

/** Starts an interval spinner on stderr when stdout is a TTY. */
export function startSpinner(label: string, intervalMs = 120): SpinnerHandle {
  if (!process.stderr.isTTY) {
    return { stop: () => undefined }
  }
  let tick = 0
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  const id = setInterval(() => {
    const frame = frames[tick % frames.length]
    process.stderr.write(
      `\r${A.brightGreen}${frame}${A.reset} ${A.brightCyan}${label}${A.reset}${' '.repeat(8)}`,
    )
    tick++
  }, intervalMs)
  return {
    stop(final?: string) {
      clearInterval(id)
      if (final) {
        process.stderr.write(`\r${A.brightGreen}✓${A.reset} ${A.brightCyan}${final}${A.reset}${' '.repeat(24)}\n`)
      } else {
        process.stderr.write('\r' + ' '.repeat(60) + '\r')
      }
    },
  }
}
