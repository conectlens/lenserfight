// Centralized ANSI terminal escape code palette for LenserFight CLI.
// No external color library — raw sequences stay here; semantic wrappers provide consistent branding.

// ─── Plain-text detection ─────────────────────────────────────────────────────
//
// Honor the NO_COLOR convention (https://no-color.org/) and degrade gracefully
// in CI environments, dumb terminals, and non-TTY pipes. Callers should use the
// semantic `c.*` wrappers rather than raw `A.*` sequences so that stripping is
// handled automatically.

export function isPlainText(): boolean {
  return (
    Boolean(process.env['NO_COLOR']) ||
    process.env['TERM'] === 'dumb' ||
    !process.stdout.isTTY
  )
}

/** Strip raw ANSI escape sequences from a string. Used for plain-text fallback. */
export function stripAnsi(s: string): string {
  // Covers CSI sequences (\x1b[...m) and OSC hyperlinks (\x1b]8;;...\x1b\\)
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b(?:\[[0-9;]*[mGKHFABCDsuJr]|\]8;;[^\x1b]*\x1b\\)/g, '')
}

/** Conditionally apply an ANSI sequence. Returns plain text when color is disabled. */
export function ansi(seq: string, text: string): string {
  return isPlainText() ? text : `${seq}${text}${A.reset}`
}

export const A = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Standard foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright (vivid) foreground variants
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgBlack: '\x1b[40m',

  // Cursor / screen control
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J',
  homeCursor: '\x1b[H',
  altScreenOn:  '\x1b[?1049h',
  altScreenOff: '\x1b[?1049l',
} as const

// ─── OSC 8 hyperlink (clickable in modern terminals) ─────────────────────────

/**
 * Wrap `label` in an OSC 8 hyperlink pointing to `url`.
 * Degrades gracefully: in plain-text mode, returns `label (url)`.
 */
export function hyperlink(url: string, label: string): string {
  if (isPlainText()) return `${label} (${url})`
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`
}

// ─── Semantic color wrappers ───────────────────────────────────────────────────
//
// All wrappers respect `isPlainText()` via `ansi()`.
// New entries carry specific semantic meaning; do not use them arbitrarily.

export const c = {
  // Brand / navigation
  brand:       (s: string) => isPlainText() ? s : `${A.brightMagenta}${A.bold}${s}${A.reset}`,
  accent:      (s: string) => ansi(A.brightCyan, s),

  // Status
  success:     (s: string) => ansi(A.brightGreen, s),
  warn:        (s: string) => ansi(A.brightYellow, s),
  error:       (s: string) => ansi(A.brightRed, s),
  info:        (s: string) => ansi(A.brightBlue, s),
  muted:       (s: string) => ansi(A.gray, s),

  // Typography
  bold:        (s: string) => isPlainText() ? s : `${A.bold}${s}${A.reset}`,
  dim:         (s: string) => isPlainText() ? s : `${A.dim}${s}${A.reset}`,

  // Battle contender slots
  slotA:       (s: string) => isPlainText() ? s : `${A.brightBlue}${A.bold}${s}${A.reset}`,
  slotB:       (s: string) => isPlainText() ? s : `${A.brightGreen}${A.bold}${s}${A.reset}`,

  // Execution context
  /** Dim cyan — active workflow / progress steps */
  progress:    (s: string) => isPlainText() ? s : `${A.cyan}${s}${A.reset}`,
  /** Bright magenta — experimental / unstable features */
  experimental:(s: string) => isPlainText() ? s : `${A.brightMagenta}${s}${A.reset}`,
  /** Bright white bold — provider identity (model, API) */
  provider:    (s: string) => isPlainText() ? s : `${A.brightWhite}${A.bold}${s}${A.reset}`,
  /** Green — local / Ollama execution */
  localhost:   (s: string) => ansi(A.green, s),
  /** Blue — cloud / remote execution */
  cloud:       (s: string) => ansi(A.blue, s),
  /** Dim yellow — replay / reproducibility hints */
  replay:      (s: string) => isPlainText() ? s : `${A.yellow}${A.dim}${s}${A.reset}`,
  /** Cyan — schema / workflow validation */
  validation:  (s: string) => ansi(A.cyan, s),
} as const

/** Unicode glyphs used for status indicators and decorative elements. */
export const sym = {
  pass:  '✓',
  fail:  '✗',
  warn:  '⚠',
  info:  '●',
  run:   '▶',
  dot:   '·',
  arrow: '→',
  fight: '⚔',
  robot: '◈',
  link:  '⎘',
  clock: '◷',
  node:  '○',
  chain: '↳',
} as const
