/**
 * LenserFight Spec Migration Utilities.
 *
 * Handles migration from the legacy `schema_version: N` numeric format to the
 * versioned `apiVersion: lenserfight.dev/v1alpha1` format.
 *
 * Migration strategy:
 *   - The migration is additive only: it inserts `apiVersion` at the top of
 *     the YAML frontmatter block without removing `schema_version`.
 *   - Both fields can coexist. Tools that understand `apiVersion` use it;
 *     tools that only understand `schema_version` continue to work.
 *   - `schema_version: 1` is treated as equivalent to `v1alpha1`.
 *   - The migration is idempotent: running it twice produces the same result.
 *   - The migration never rewrites prose sections or comment blocks.
 *
 * GRASP: Information Expert — this module owns the mapping from legacy to
 * current format. No caller should need to know the mapping details.
 */

import { CURRENT_API_VERSION } from './api-version'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MigrationPlan {
  filePath: string
  currentApiVersion: string | null
  targetApiVersion: string
  alreadyMigrated: boolean
  hasLegacySchemaVersion: boolean
  schemaVersion?: number
}

export interface MigrationResult {
  filePath: string
  status: 'migrated' | 'already_current' | 'skipped' | 'error'
  reason?: string
  /** New file contents after migration. Only set when status === 'migrated'. */
  newContents?: string
}

// ─── Schema version → apiVersion mapping ─────────────────────────────────────

const SCHEMA_VERSION_TO_API_VERSION: Record<number, string> = {
  1: 'lenserfight.dev/v1alpha1',
}

export function schemaVersionToApiVersion(schemaVersion: number): string | null {
  return SCHEMA_VERSION_TO_API_VERSION[schemaVersion] ?? null
}

// ─── Frontmatter detection ────────────────────────────────────────────────────

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/

interface ParsedDocument {
  frontmatterRaw: string
  body: string
}

export function splitDocument(contents: string): ParsedDocument | null {
  const match = contents.match(FRONTMATTER_REGEX)
  if (!match) return null
  return { frontmatterRaw: match[1], body: match[2] }
}

// ─── apiVersion injection ─────────────────────────────────────────────────────

const API_VERSION_LINE_REGEX = /^apiVersion:\s*.+$/m
const SCHEMA_VERSION_LINE_REGEX = /^schema_version:\s*(\d+)$/m

/**
 * Extract the current `apiVersion` value from raw frontmatter text, or null
 * if not present.
 */
export function extractApiVersionFromFrontmatter(frontmatterRaw: string): string | null {
  const match = frontmatterRaw.match(/^apiVersion:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Extract the `schema_version` integer from raw frontmatter text, or null.
 */
export function extractSchemaVersionFromFrontmatter(frontmatterRaw: string): number | null {
  const match = frontmatterRaw.match(SCHEMA_VERSION_LINE_REGEX)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Build a migration plan for a given file's contents without touching the FS.
 *
 * @param filePath - Path to the file (informational only).
 * @param contents - Raw file contents.
 * @param targetApiVersion - Target apiVersion to migrate to (defaults to CURRENT_API_VERSION).
 */
export function planMigration(
  filePath: string,
  contents: string,
  targetApiVersion = CURRENT_API_VERSION,
): MigrationPlan {
  const parsed = splitDocument(contents)

  if (!parsed) {
    return {
      filePath,
      currentApiVersion: null,
      targetApiVersion,
      alreadyMigrated: false,
      hasLegacySchemaVersion: false,
    }
  }

  const currentApiVersion = extractApiVersionFromFrontmatter(parsed.frontmatterRaw)
  const schemaVersion = extractSchemaVersionFromFrontmatter(parsed.frontmatterRaw) ?? undefined

  return {
    filePath,
    currentApiVersion,
    targetApiVersion,
    alreadyMigrated: currentApiVersion === targetApiVersion,
    hasLegacySchemaVersion: typeof schemaVersion === 'number',
    schemaVersion,
  }
}

/**
 * Apply the migration to raw file contents.
 *
 * Returns `null` when the file has no frontmatter block (nothing to migrate).
 * Returns the unchanged contents when already migrated (idempotent).
 * Returns the updated contents when the migration was applied.
 */
export function applyMigration(
  contents: string,
  targetApiVersion = CURRENT_API_VERSION,
): string | null {
  const parsed = splitDocument(contents)
  if (!parsed) return null

  let fm = parsed.frontmatterRaw

  // Idempotency: already has the target apiVersion — nothing to do.
  if (API_VERSION_LINE_REGEX.test(fm)) {
    // Replace existing apiVersion line with the target (handles re-migration).
    fm = fm.replace(API_VERSION_LINE_REGEX, `apiVersion: ${targetApiVersion}`)
  } else {
    // Prepend apiVersion as the first line of the frontmatter block.
    fm = `apiVersion: ${targetApiVersion}\n${fm}`
  }

  return `---\n${fm}\n---\n${parsed.body}`
}

/**
 * Migrate a single file's contents in memory.
 *
 * @param filePath - Informational only (used in the result).
 * @param contents - Raw file contents.
 * @param targetApiVersion - Target version (default: CURRENT_API_VERSION).
 */
export function migrateContents(
  filePath: string,
  contents: string,
  targetApiVersion = CURRENT_API_VERSION,
): MigrationResult {
  const plan = planMigration(filePath, contents, targetApiVersion)

  if (!splitDocument(contents)) {
    return { filePath, status: 'skipped', reason: 'No frontmatter block found.' }
  }

  if (plan.alreadyMigrated) {
    return { filePath, status: 'already_current' }
  }

  const newContents = applyMigration(contents, targetApiVersion)
  if (!newContents) {
    return { filePath, status: 'error', reason: 'Failed to apply migration.' }
  }

  return { filePath, status: 'migrated', newContents }
}
