import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import consola from 'consola'
import { getEffectiveMode } from '../config/project-config'
import { callRpc } from '../utils/api'
import type { AutomationObjectKind } from '@lenserfight/types'
import {
  exportAutomationObject,
  loadAutomationRegistry,
  parseAutomationDocument,
  type AutomationRegistryEntry,
} from '../utils/automation-objects'

export function assertSupabaseLocalForSync(): void {
  const { mode, source } = getEffectiveMode()
  if (mode !== 'local') {
    throw new Error(
      `lf sync requires Supabase local API (lf use local or lf --local sync). Effective mode is ${mode} (${source}).`
    )
  }
}

export interface SyncPlanRow {
  kind: AutomationObjectKind
  id: string
  name: string
  path: string
  action: 'push' | 'pull' | 'skip'
  detail: string
}

export function planFileToSupabase(cwd = process.cwd()): SyncPlanRow[] {
  const registry = loadAutomationRegistry(cwd)
  return registry.map((entry) => ({
    kind: entry.kind,
    id: entry.id,
    name: entry.name,
    path: entry.path ?? '—',
    action: 'push' as const,
    detail: 'Would upsert to Supabase local',
  }))
}

export async function pushRegistryEntry(
  entry: AutomationRegistryEntry,
  cwd = process.cwd(),
  dryRun = false
): Promise<void> {
  if (!entry.path) {
    throw new Error(`Registry entry ${entry.kind}:${entry.id} has no path.`)
  }
  const filePath = resolve(cwd, entry.path)
  const parsed = parseAutomationDocument(filePath)
  if (!parsed.ok || !parsed.document) {
    throw new Error(`Validation failed for ${filePath}`)
  }

  if (dryRun) {
    consola.info('[dry-run] push %s:%s (%s)', entry.kind, entry.id, entry.path)
    return
  }

  const body = parsed.document.body?.trim() ?? ''
  if (entry.kind === 'lens' && body.length >= 50) {
    await callRpc(
      'fn_create_lens',
      {
        p_visibility: 'private',
        p_template_body: body,
        p_title: entry.name,
        p_description: null,
        p_language_code: 'en',
        p_params: [],
        p_tag_ids: [],
        p_parent_lens_id: null,
        p_forked_from_execution_id: null,
      },
      { requireAuth: true }
    )
    return
  }

  consola.warn(
    'Skip %s:%s — automated push not yet implemented for this kind (lens with body >= 50 chars supported).',
    entry.kind,
    entry.id
  )
}

export function pullRegistryEntry(
  kind: AutomationObjectKind,
  id: string,
  cwd = process.cwd(),
  dryRun = false
): { target: string } {
  if (dryRun) {
    consola.info('[dry-run] pull %s:%s', kind, id)
    return { target: '—' }
  }
  const { target } = exportAutomationObject(kind, id, undefined, cwd)
  return { target }
}

export async function pushAllFromRegistry(options: {
  cwd?: string
  dryRun?: boolean
  kind?: AutomationObjectKind
  id?: string
}): Promise<{ pushed: number; skipped: number }> {
  assertSupabaseLocalForSync()
  const cwd = options.cwd ?? process.cwd()
  let entries = loadAutomationRegistry(cwd)
  if (options.kind) entries = entries.filter((e) => e.kind === options.kind)
  if (options.id) entries = entries.filter((e) => e.id === options.id)

  let pushed = 0
  let skipped = 0
  for (const entry of entries) {
    try {
      await pushRegistryEntry(entry, cwd, options.dryRun)
      if (entry.kind === 'lens') pushed++
      else skipped++
    } catch (err) {
      consola.error('%s:%s — %s', entry.kind, entry.id, err instanceof Error ? err.message : err)
      skipped++
    }
  }
  return { pushed, skipped }
}

export function readFileBodyForSync(filePath: string): string {
  return readFileSync(filePath, 'utf-8')
}
