import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printTable } from '../utils/output'

// Phase BY — `lf security` surface
//
// rls-audit: queries fn_rls_unprotected_tables() + fn_security_definer_no_search_path()
// and exits 1 if any violations are found, so it can gate CI pipelines.

// ─── lf security rls-audit ──────────────────────────────────────────────────

const rlsAudit = defineCommand({
  meta: {
    name: 'rls-audit',
    description:
      'Audit RLS coverage and SECURITY DEFINER hygiene. Exits 1 if any violations found.',
  },
  args: {
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const [unprotected, noSearchPath] = await Promise.all([
        callRpc<Array<{ schema_name: string; table_name: string }>>(
          'fn_rls_unprotected_tables',
          {},
          { requireAuth: true }
        ),
        callRpc<Array<{ schema_name: string; function_name: string; full_signature: string }>>(
          'fn_security_definer_no_search_path',
          {},
          { requireAuth: true }
        ),
      ])

      const hasViolations = unprotected.length > 0 || noSearchPath.length > 0

      if (args.json) {
        process.stdout.write(
          JSON.stringify({ unprotected_tables: unprotected, definer_no_search_path: noSearchPath }, null, 2) + '\n'
        )
        if (hasViolations) process.exitCode = 1
        return
      }

      if (unprotected.length > 0) {
        consola.error(`${unprotected.length} table(s) missing RLS:`)
        printTable(
          ['schema', 'table'],
          unprotected.map((r) => [r.schema_name, r.table_name])
        )
      } else {
        consola.success('All sensitive tables have RLS enabled.')
      }

      if (noSearchPath.length > 0) {
        consola.warn(`${noSearchPath.length} SECURITY DEFINER function(s) missing SET search_path:`)
        printTable(
          ['schema', 'function', 'signature'],
          noSearchPath.map((r) => [r.schema_name, r.function_name, r.full_signature])
        )
      } else {
        consola.success('All SECURITY DEFINER functions have SET search_path configured.')
      }

      if (hasViolations) {
        consola.error('RLS audit FAILED. Fix violations before deploying.')
        process.exitCode = 1
      } else {
        consola.success('RLS audit PASSED.')
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ─────────────────────────────────────────────────────────────────

const securityCommand = defineCommand({
  meta: {
    name: 'security',
    description: 'Database security audit commands.',
  },
  subCommands: {
    'rls-audit': rlsAudit,
  },
})

export default securityCommand
export { securityCommand }
