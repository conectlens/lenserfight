/**
 * CSV schema + writer for the CLI command-surface audit report (issue #453).
 *
 * This module owns the column order and RFC 4180 escaping rules. The actual
 * audit run (spawning the built binary, walking the command inventory) lives
 * in `tools/cli-release/cli-audit.mjs` — a plain Node script, since
 * tools/cli-release/ has no TypeScript toolchain and this repo's `engines`
 * floor (Node >=22) can't reliably import .ts files directly. That script
 * mirrors the column order and escaping rules defined here; this module's
 * spec is the source of truth both files are checked against.
 */

/** Stable column order for the audit CSV. Do not reorder without updating the runner. */
export const AUDIT_CSV_COLUMNS = [
  'run_id',
  'timestamp',
  'cli_version',
  'git_commit',
  'os',
  'arch',
  'runtime_version',
  'executable_name',
  'top_level_command',
  'full_command_path',
  'scenario_name',
  'arguments_summary_redacted',
  'expected_behavior',
  'actual_behavior',
  'exit_status',
  'stdout_summary',
  'stderr_summary',
  'error_category',
  'error_detail',
  'root_cause_detail',
  'additional_details',
  'severity',
  'reproducibility',
  'destructive_risk',
  'auth_state',
  'network_state',
  'test_layer',
  'related_test',
  'related_issue_or_pr',
  'resolution_status',
  'fix_summary',
  'verification_result',
  'verification_evidence',
  'owner_subsystem',
] as const

export type AuditCsvColumn = (typeof AUDIT_CSV_COLUMNS)[number]

/** One CSV row. Every column is a required string — use '' for "not applicable", never omit a key. */
export type AuditRow = Record<AuditCsvColumn, string>

/**
 * RFC 4180 field escaping: quote any field containing a comma, a double
 * quote, or a newline; double internal quotes.
 */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function rowToCsvLine(row: AuditRow): string {
  return AUDIT_CSV_COLUMNS.map((col) => escapeCsvField(row[col] ?? '')).join(',')
}

/** Renders the full CSV, header included, with `\n` line endings. */
export function rowsToCsv(rows: AuditRow[]): string {
  const header = AUDIT_CSV_COLUMNS.join(',')
  const lines = rows.map(rowToCsvLine)
  return [header, ...lines].join('\n') + '\n'
}

/** Convenience constructor: fills every column with '' so callers only set what applies. */
export function emptyAuditRow(overrides: Partial<AuditRow> = {}): AuditRow {
  const row = {} as AuditRow
  for (const col of AUDIT_CSV_COLUMNS) row[col] = ''
  return { ...row, ...overrides }
}
