// Centralized ANSI terminal escape code palette for LenserFight CLI.
// No external color library — raw sequences stay here; semantic wrappers provide consistent branding.

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

  // Cursor / screen control
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  clearScreen: '\x1b[2J',
  homeCursor: '\x1b[H',
  altScreenOn:  '\x1b[?1049h',
  altScreenOff: '\x1b[?1049l',
} as const

/** Semantic color wrappers — apply color around text and reset after. */
export const c = {
  brand:   (s: string) => `${A.brightMagenta}${A.bold}${s}${A.reset}`,
  accent:  (s: string) => `${A.brightCyan}${s}${A.reset}`,
  success: (s: string) => `${A.brightGreen}${s}${A.reset}`,
  warn:    (s: string) => `${A.brightYellow}${s}${A.reset}`,
  error:   (s: string) => `${A.brightRed}${s}${A.reset}`,
  info:    (s: string) => `${A.brightBlue}${s}${A.reset}`,
  muted:   (s: string) => `${A.gray}${s}${A.reset}`,
  bold:    (s: string) => `${A.bold}${s}${A.reset}`,
  dim:     (s: string) => `${A.dim}${s}${A.reset}`,
  slotA:   (s: string) => `${A.brightBlue}${A.bold}${s}${A.reset}`,
  slotB:   (s: string) => `${A.brightGreen}${A.bold}${s}${A.reset}`,
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
} as const
