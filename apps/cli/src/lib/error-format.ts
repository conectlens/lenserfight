/**
 * Turns a raw dispatch failure into a concise, human-readable shape: cause,
 * invalid token, valid alternatives, recovery action. The full stack is kept
 * on `.detail` for --debug / an expandable per-entry toggle — never dumped by
 * default (that wall of citty stack frames is exactly the bug this replaces).
 */
export interface FormattedError {
  cause: string
  invalidToken?: string
  alternatives: string[]
  recovery: string
  detail: string
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function detailOf(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err)
}

function codeOf(err: unknown): string | undefined {
  return err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : undefined
}

export function formatDispatchError(err: unknown, argv: readonly string[], suggestions: readonly string[]): FormattedError {
  const message = messageOf(err)
  const detail = detailOf(err)
  const isUnknownCommand = codeOf(err) === 'E_UNKNOWN_COMMAND' || /unknown command/i.test(message)

  if (isUnknownCommand) {
    const invalidToken = argv.find((t) => !t.startsWith('-'))
    return {
      cause: invalidToken ? `Unknown command "${invalidToken}".` : 'Unknown command.',
      invalidToken,
      alternatives: [...suggestions],
      recovery: suggestions.length
        ? `Did you mean "${suggestions[0]}"? Type /help to browse all commands, or Ctrl+K to search.`
        : 'Type /help to browse all commands, or Ctrl+K to search.',
      detail,
    }
  }

  return {
    cause: message || 'Command failed.',
    alternatives: [],
    recovery: 'Re-run with --debug (or press d on this entry) for full diagnostic details.',
    detail,
  }
}
