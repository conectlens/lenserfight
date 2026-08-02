/**
 * OpenCode's TUI (launched by `lf assist`) performs a terminal handshake
 * (cursor position, color, and capability queries) before it renders
 * anything, then switches to the alternate screen buffer. Without a real
 * terminal emulator to answer those queries — a script, CI job, or an AI
 * agent's built-in command-execution terminal — it hangs forever on a
 * blank screen instead of failing loudly. Callers should check this before
 * launching an interactive TUI and fail fast with a clear message instead.
 */
export function isInteractiveTerminal(): boolean {
  return Boolean(process.stdout.isTTY && process.stdin.isTTY)
}
