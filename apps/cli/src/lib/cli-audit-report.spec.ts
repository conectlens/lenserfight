import { AUDIT_CSV_COLUMNS, emptyAuditRow, escapeCsvField, rowToCsvLine, rowsToCsv } from './cli-audit-report'

describe('AUDIT_CSV_COLUMNS', () => {
  it('has the 34 columns from the audit schema, in stable order', () => {
    expect(AUDIT_CSV_COLUMNS).toEqual([
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
    ])
  })
})

describe('escapeCsvField', () => {
  it('leaves plain fields untouched', () => {
    expect(escapeCsvField('battle list')).toBe('battle list')
  })

  it('quotes fields containing a comma', () => {
    expect(escapeCsvField('a, b')).toBe('"a, b"')
  })

  it('quotes fields containing a double quote and doubles it', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""')
  })

  it('quotes fields containing a newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"')
  })

  it('quotes fields containing a carriage return', () => {
    expect(escapeCsvField('line1\r\nline2')).toBe('"line1\r\nline2"')
  })
})

describe('emptyAuditRow', () => {
  it('fills every column with an empty string by default', () => {
    const row = emptyAuditRow()
    for (const col of AUDIT_CSV_COLUMNS) expect(row[col]).toBe('')
  })

  it('applies overrides on top of the empty defaults', () => {
    const row = emptyAuditRow({ top_level_command: 'battle', exit_status: '0' })
    expect(row.top_level_command).toBe('battle')
    expect(row.exit_status).toBe('0')
    expect(row.scenario_name).toBe('')
  })
})

describe('rowToCsvLine / rowsToCsv', () => {
  it('joins columns in AUDIT_CSV_COLUMNS order', () => {
    const row = emptyAuditRow({ run_id: 'r1', top_level_command: 'battle' })
    const line = rowToCsvLine(row)
    const fields = line.split(',')
    expect(fields[AUDIT_CSV_COLUMNS.indexOf('run_id')]).toBe('r1')
    expect(fields[AUDIT_CSV_COLUMNS.indexOf('top_level_command')]).toBe('battle')
  })

  it('escapes fields that need it within a full row', () => {
    const row = emptyAuditRow({ stdout_summary: 'a, "quoted", b' })
    const line = rowToCsvLine(row)
    expect(line).toContain('"a, ""quoted"", b"')
  })

  it('renders a header line followed by one line per row, newline-terminated', () => {
    const rows = [emptyAuditRow({ run_id: 'r1' }), emptyAuditRow({ run_id: 'r2' })]
    const csv = rowsToCsv(rows)
    const lines = csv.split('\n')
    expect(lines[0]).toBe(AUDIT_CSV_COLUMNS.join(','))
    expect(lines[1].startsWith('r1')).toBe(true)
    expect(lines[2].startsWith('r2')).toBe(true)
    expect(csv.endsWith('\n')).toBe(true)
  })

  it('produces an empty-rows CSV with just the header', () => {
    expect(rowsToCsv([])).toBe(AUDIT_CSV_COLUMNS.join(',') + '\n')
  })
})
