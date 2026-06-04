/**
 * `lf spec` — LenserFight Spec Governance commands.
 *
 * Subcommands:
 *   lf spec validate [path]      — Validate spec files and report apiVersion status.
 *   lf spec inspect <file>       — Print a structured human-readable spec summary.
 *   lf spec migrate [path]       — Add `apiVersion: lenserfight.dev/v1alpha1` to spec files.
 *   lf spec digest <file>        — Compute the SHA-256 content hash of a spec frontmatter.
 *   lf spec kinds                — List all recognized spec kinds with metadata.
 *   lf spec schema <kind>        — Print the JSON Schema for a given spec kind.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineCommand } from 'citty'
import consola from 'consola'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

import {
  CURRENT_API_VERSION,
  validateApiVersion,
  SPEC_KINDS,
  SPEC_KIND_META,
  normalizeSpecKind,
  computeSpecDigest,
  planMigration,
  migrateContents,
} from '@lenserfight/domain/spec-governance'

import {
  discoverLenserfightWorkspace,
  findAutomationFiles,
  parseAutomationDocument,
} from '../utils/automation-objects'
import { printJson, printTable } from '../utils/output'

// ─── lf spec validate ────────────────────────────────────────────────────────

const specValidate = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate spec files and report apiVersion status.',
  },
  args: {
    path: {
      type: 'positional',
      description: 'File or directory to validate (default: current workspace)',
      default: '.',
    },
    json: {
      type: 'boolean',
      description: 'Output results as JSON',
      default: false,
    },
    strict: {
      type: 'boolean',
      description: 'Treat missing apiVersion as an error instead of a warning',
      default: false,
    },
  },
  async run({ args }) {
    const useWorkspaceDiscovery = !args.path || args.path === '.'
    const files = useWorkspaceDiscovery
      ? discoverLenserfightWorkspace().winners.map((obj) => obj.filePath)
      : findAutomationFiles(args.path)

    if (files.length === 0) {
      consola.warn('No spec files found under %s.', args.path)
      process.exitCode = 1
      return
    }

    const rows = files.map((filePath) => {
      const result = parseAutomationDocument(filePath)
      const fm = result.document?.frontmatter as unknown as Record<string, unknown> | undefined
      const avRaw = fm?.apiVersion
      const avResult = validateApiVersion(avRaw)

      const apiVersionStatus =
        avResult.outcome === 'valid'
          ? 'valid'
          : avResult.outcome === 'missing'
            ? 'missing'
            : avResult.outcome === 'deprecated'
              ? 'deprecated'
              : 'invalid'

      const specOk =
        result.ok &&
        (args.strict ? avResult.outcome === 'valid' : avResult.outcome !== 'malformed')

      return {
        filePath,
        kind: result.kind ?? '-',
        apiVersion: typeof avRaw === 'string' ? avRaw : '-',
        apiVersionStatus,
        ok: specOk,
        issues: result.issues,
      }
    })

    if (args.json) {
      printJson(rows)
      if (rows.some((r) => !r.ok)) process.exitCode = 1
      return
    }

    printTable(
      ['File', 'Kind', 'apiVersion', 'Status', 'Issues'],
      rows.map((r) => [
        basename(r.filePath),
        r.kind,
        r.apiVersion,
        r.ok ? 'valid' : 'invalid',
        r.issues
          .filter((i) => i.severity === 'error')
          .map((i) => `${i.path}: ${i.message}`)
          .join(' | ') || '-',
      ])
    )

    const missingCount = rows.filter((r) => r.apiVersionStatus === 'missing').length
    if (missingCount > 0) {
      consola.info(
        '%d file(s) missing apiVersion. Run `lf spec migrate` to add it.',
        missingCount
      )
    }

    const invalidCount = rows.filter((r) => !r.ok).length
    if (invalidCount > 0) {
      consola.error('%d file(s) failed validation.', invalidCount)
      process.exitCode = 1
      return
    }

    consola.success('Validated %d spec file(s).', rows.length)
  },
})

// ─── lf spec inspect ─────────────────────────────────────────────────────────

const specInspect = defineCommand({
  meta: {
    name: 'inspect',
    description: 'Print a structured summary of a spec file.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the spec Markdown file',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const filePath = resolve(args.file)
    if (!existsSync(filePath)) {
      consola.error('File not found: %s', filePath)
      process.exitCode = 1
      return
    }

    const result = parseAutomationDocument(filePath)
    const fm = result.document?.frontmatter as unknown as Record<string, unknown> | undefined

    if (!fm) {
      consola.error('Failed to parse spec file: %s', filePath)
      result.issues.forEach((i) => consola.error('  %s: %s', i.path, i.message))
      process.exitCode = 1
      return
    }

    const avRaw = fm.apiVersion
    const avResult = validateApiVersion(avRaw)
    const specKind = normalizeSpecKind(String(fm.kind ?? ''))
    const kindMeta = specKind ? SPEC_KIND_META[specKind] : undefined

    const digest = computeSpecDigest(fm)

    const summary = {
      file: filePath,
      apiVersion: avRaw ?? null,
      apiVersionStatus: avResult.outcome,
      kind: fm.kind ?? null,
      specKind: specKind ?? null,
      id: fm.id ?? null,
      slug: fm.slug ?? null,
      name: fm.name ?? null,
      version: fm.version ?? null,
      visibility: fm.visibility ?? null,
      status: fm.status ?? null,
      description: fm.description ?? null,
      tags: fm.tags ?? null,
      contentHash: digest,
      executable: kindMeta?.executable ?? null,
      hashable: kindMeta?.hashable ?? null,
      forkable: kindMeta?.forkable ?? null,
      sections: Object.keys(result.document?.sections ?? {}),
      requiredSections: kindMeta?.requiredSections ?? [],
      issues: result.issues,
      valid: result.ok,
    }

    if (args.json) {
      printJson(summary)
      return
    }

    consola.log('')
    consola.log(`  Spec: ${String(fm.name ?? basename(filePath))}`)
    consola.log(`  File: ${filePath}`)
    consola.log(`  Kind: ${String(fm.kind ?? '-')}${specKind ? ` (${specKind})` : ''}`)
    consola.log(`  apiVersion: ${avRaw ? String(avRaw) : '(missing)'} [${avResult.outcome}]`)
    consola.log(`  ID: ${String(fm.id ?? '-')}`)
    consola.log(`  Version: ${String(fm.version ?? '-')}`)
    consola.log(`  Visibility: ${String(fm.visibility ?? '-')}`)
    consola.log(`  Status: ${String(fm.status ?? '-')}`)
    consola.log(`  Content hash: ${digest}`)
    consola.log(`  Executable: ${kindMeta?.executable ?? '-'}`)
    if (summary.sections.length > 0) {
      consola.log(`  Sections: ${summary.sections.join(', ')}`)
    }
    consola.log('')

    if (result.issues.length > 0) {
      consola.log('  Issues:')
      result.issues.forEach((i) => {
        if (i.severity === 'error') consola.error('    [error] %s: %s', i.path, i.message)
        else consola.warn('    [warn]  %s: %s', i.path, i.message)
      })
      consola.log('')
    }

    if (!result.ok) process.exitCode = 1
  },
})

// ─── lf spec migrate ─────────────────────────────────────────────────────────

const specMigrate = defineCommand({
  meta: {
    name: 'migrate',
    description:
      `Add \`apiVersion: ${CURRENT_API_VERSION}\` to spec files that use the legacy \`schema_version\` field.`,
  },
  args: {
    path: {
      type: 'positional',
      description: 'File or directory to migrate (default: current workspace)',
      default: '.',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Print what would change without writing files',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output results as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const dryRun = args['dry-run']
    const useWorkspaceDiscovery = !args.path || args.path === '.'
    const files = useWorkspaceDiscovery
      ? discoverLenserfightWorkspace().winners.map((obj) => obj.filePath)
      : findAutomationFiles(args.path)

    if (files.length === 0) {
      consola.warn('No spec files found under %s.', args.path)
      return
    }

    const results = files.map((filePath) => {
      const contents = readFileSync(filePath, 'utf-8')
      return migrateContents(filePath, contents)
    })

    if (args.json) {
      printJson(results)
      return
    }

    const migrated = results.filter((r) => r.status === 'migrated')
    const current = results.filter((r) => r.status === 'already_current')
    const skipped = results.filter((r) => r.status === 'skipped')
    const errors = results.filter((r) => r.status === 'error')

    if (!dryRun) {
      for (const r of migrated) {
        if (r.newContents) writeFileSync(r.filePath, r.newContents, 'utf-8')
      }
    }

    printTable(
      ['File', 'Status', 'Reason'],
      results.map((r) => [basename(r.filePath), r.status, r.reason ?? '-'])
    )

    consola.log('')
    if (dryRun) {
      consola.info('[dry-run] %d file(s) would be updated.', migrated.length)
    } else {
      consola.success('Migrated %d file(s).', migrated.length)
    }
    if (current.length > 0) consola.info('%d file(s) already at current version.', current.length)
    if (skipped.length > 0) consola.warn('%d file(s) skipped (no frontmatter).', skipped.length)
    if (errors.length > 0) {
      consola.error('%d file(s) failed migration.', errors.length)
      process.exitCode = 1
    }
  },
})

// ─── lf spec digest ──────────────────────────────────────────────────────────

const specDigest = defineCommand({
  meta: {
    name: 'digest',
    description: 'Compute the SHA-256 content hash of a spec frontmatter.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the spec Markdown file',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const filePath = resolve(args.file)
    if (!existsSync(filePath)) {
      consola.error('File not found: %s', filePath)
      process.exitCode = 1
      return
    }

    const contents = readFileSync(filePath, 'utf-8')
    const match = contents.match(/^---\n([\s\S]*?)\n---/)
    if (!match) {
      consola.error('No frontmatter found in %s.', filePath)
      process.exitCode = 1
      return
    }

    let fm: Record<string, unknown>
    try {
      fm = parseYaml(match[1]) as Record<string, unknown>
    } catch (err) {
      consola.error('Failed to parse frontmatter YAML: %s', (err as Error).message)
      process.exitCode = 1
      return
    }

    const digest = computeSpecDigest(fm)

    if (args.json) {
      printJson({ file: filePath, contentHash: digest, kind: fm.kind ?? null, id: fm.id ?? null })
      return
    }

    consola.log('%s  %s', digest, basename(filePath))
  },
})

// ─── lf spec kinds ───────────────────────────────────────────────────────────

const specKinds = defineCommand({
  meta: {
    name: 'kinds',
    description: 'List all recognized LenserFight spec kinds.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const metas = SPEC_KINDS.map((kind) => SPEC_KIND_META[kind])

    if (args.json) {
      printJson(metas)
      return
    }

    printTable(
      ['Kind', 'File', 'Executable', 'Hashable', 'Forkable', 'Description'],
      metas.map((m) => [
        m.kind,
        m.fileName,
        m.executable ? 'yes' : 'no',
        m.hashable ? 'yes' : 'no',
        m.forkable ? 'yes' : 'no',
        m.description.slice(0, 60) + (m.description.length > 60 ? '…' : ''),
      ])
    )
  },
})

// ─── lf spec schema ──────────────────────────────────────────────────────────

const specSchema = defineCommand({
  meta: {
    name: 'schema',
    description: 'Print the JSON Schema for a given spec kind.',
  },
  args: {
    kind: {
      type: 'positional',
      description: 'Spec kind (e.g. lens, lenser, colens, battle, ray, evaluation, execution)',
      required: true,
    },
  },
  async run({ args }) {
    const kindArg = args.kind.toLowerCase()
    const schemaFileMap: Record<string, string> = {
      lens: 'lens.schema.json',
      lenser: 'lenser.schema.json',
      colens: 'colens.schema.json',
      battle: 'battle.schema.json',
      ray: 'ray.schema.json',
      evaluation: 'evaluation.schema.json',
      execution: 'execution.schema.json',
      team: 'team.schema.json',
      agent: 'agent.schema.json',
      agent_team: 'agent-team.schema.json',
      tool: 'tool.schema.json',
      workflow: 'workflow.schema.json',
      private_battle: 'private-battle.schema.json',
      skill: 'skill.schema.json',
      memory_policy: 'memory-policy.schema.json',
      dataset: 'dataset.schema.json',
      benchmark: 'benchmark.schema.json',
      run_report: 'run-report.schema.json',
      common: 'common.schema.json',
    }

    const schemaFileName = schemaFileMap[kindArg]
    if (!schemaFileName) {
      consola.error(
        'Unknown kind "%s". Available kinds: %s',
        kindArg,
        Object.keys(schemaFileMap).join(', ')
      )
      process.exitCode = 1
      return
    }

    // Locate schema file relative to this package's distribution location.
    const _thisFile = fileURLToPath(import.meta.url)
    const _thisDir = dirname(_thisFile)

    const candidates = [
      // Monorepo source (development) — walk up to repo root
      resolve(
        _thisFile.replace(/\/apps\/cli\/.*$/, ''),
        'libs/domain/spec-governance/src/lib/schemas',
        schemaFileName
      ),
      // Built distribution — schemas bundled next to this file
      resolve(_thisDir, '../schemas', schemaFileName),
    ]

    const schemaPath = candidates.find((p) => existsSync(p))
    if (!schemaPath) {
      consola.error('Schema file not found for kind "%s".', kindArg)
      process.exitCode = 1
      return
    }

    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
    process.stdout.write(JSON.stringify(schema, null, 2) + '\n')
  },
})

// ─── lf spec export-schema ───────────────────────────────────────────────────

const specExportSchema = defineCommand({
  meta: {
    name: 'export-schema',
    description:
      'Export a spec frontmatter as a standalone YAML or JSON document (without the Markdown body).',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the spec Markdown file',
      required: true,
    },
    format: {
      type: 'string',
      description: 'Output format: yaml or json (default: yaml)',
      default: 'yaml',
    },
    out: {
      type: 'string',
      description: 'Write output to this file instead of stdout',
    },
  },
  async run({ args }) {
    const filePath = resolve(args.file)
    if (!existsSync(filePath)) {
      consola.error('File not found: %s', filePath)
      process.exitCode = 1
      return
    }

    const result = parseAutomationDocument(filePath)
    if (!result.ok) {
      consola.error('Spec validation failed. Fix errors first.')
      result.issues
        .filter((i) => i.severity === 'error')
        .forEach((i) => consola.error('  %s: %s', i.path, i.message))
      process.exitCode = 1
      return
    }

    const fm = result.document?.frontmatter as unknown as Record<string, unknown>
    const digest = computeSpecDigest(fm)
    const plan = planMigration(filePath, readFileSync(filePath, 'utf-8'))

    const exported = {
      ...fm,
      apiVersion: fm.apiVersion ?? CURRENT_API_VERSION,
      _content_hash: digest,
      _migrated_from_schema_version: plan.hasLegacySchemaVersion ? plan.schemaVersion : undefined,
    }

    let output: string
    if (args.format === 'json') {
      output = JSON.stringify(exported, null, 2) + '\n'
    } else {
      output = stringifyYaml(exported)
    }

    if (args.out) {
      writeFileSync(resolve(args.out), output, 'utf-8')
      consola.success('Exported to %s', args.out)
    } else {
      process.stdout.write(output)
    }
  },
})

// ─── Root spec command ────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'spec',
    description: 'LenserFight spec governance: validate, inspect, migrate, and hash spec files.',
  },
  subCommands: {
    validate: specValidate,
    inspect: specInspect,
    migrate: specMigrate,
    digest: specDigest,
    kinds: specKinds,
    schema: specSchema,
    'export-schema': specExportSchema,
  },
})
