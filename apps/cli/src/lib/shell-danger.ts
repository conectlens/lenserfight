/**
 * Pattern-based destructive-shell detector for the REPL's `!` prefix.
 * Distinct from lib/safety/guard.ts (which gates citty commands that already
 * know their own risk/description) — arbitrary shell text has no such
 * metadata, so this matches common destructive shapes instead.
 */
const DESTRUCTIVE_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /\bdel\s+.*\/s\b/i, label: 'recursive delete (del /s)' },
  { pattern: /\brmdir\s+.*\/s\b/i, label: 'recursive directory removal (rmdir /s)' },
  { pattern: /\bgit\s+push\b.*(--force\b|-f\b)/i, label: 'force-push' },
  { pattern: /\bgit\s+reset\s+--hard\b/i, label: 'hard reset (discards uncommitted work)' },
  { pattern: /\bgit\s+clean\b.*-\w*f\w*/i, label: 'git clean (deletes untracked files)' },
  { pattern: /\bdrop\s+(table|database|schema)\b/i, label: 'DROP statement' },
  { pattern: /\btruncate\s+table\b/i, label: 'TRUNCATE statement' },
  { pattern: />\s*\/dev\/sd[a-z]/i, label: 'raw disk write' },
  { pattern: /\bmkfs\b/i, label: 'filesystem format' },
  { pattern: /\bshutdown\b|\breboot\b/i, label: 'system shutdown/reboot' },
  { pattern: /\bformat\s+[a-z]:/i, label: 'drive format (Windows)' },
]

/** `rm` is checked separately: flags for the same invocation can be spread across
 *  multiple tokens (`-r -f`, `-rf`, `-fr`, `--recursive --force`) — a single regex
 *  can't reliably combine them, so this walks the tokens instead. */
function rmDanger(command: string): string | null {
  const tokens = command.trim().split(/\s+/)
  const rmIndex = tokens.findIndex((t) => /^rm(\.exe)?$/i.test(t))
  if (rmIndex === -1) return null
  let hasRecursive = false
  let hasForce = false
  for (const tok of tokens.slice(rmIndex + 1)) {
    if (tok === '--recursive' || (/^-\w+$/.test(tok) && tok.includes('r'))) hasRecursive = true
    if (tok === '--force' || (/^-\w+$/.test(tok) && tok.includes('f'))) hasForce = true
  }
  if (hasRecursive && hasForce) return 'recursive force delete (rm -rf)'
  if (hasRecursive) return 'recursive delete (rm -r)'
  return null
}

/** Returns a short human label for the destructive shape matched, or null if the command looks safe. */
export function describeShellDanger(command: string): string | null {
  const rm = rmDanger(command)
  if (rm) return rm
  for (const { pattern, label } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(command)) return label
  }
  return null
}
