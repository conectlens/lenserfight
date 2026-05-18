import consola from 'consola'
import { defineCommand } from 'citty'

import { callRpc, handleError } from './api'
import { printJson, printTable } from './output'

export type CliArtifactType = 'lens' | 'workflow' | 'battle' | 'agent'
export type CliLifecycleAction = 'status' | 'archive' | 'restore' | 'delete' | 'pin' | 'unpin'

export interface CliLifecycleStatus {
  artifact_type: string
  artifact_id: string
  state: string
  visibility?: string | null
  archived_at?: string | null
  deleted_at?: string | null
  pinned?: boolean
  version_id?: string | null
  snapshot_hash?: string | null
  dependency_summary?: {
    total?: number
    counts?: Record<string, number>
    blocking_reasons?: string[]
  }
  delete_mode?: string
}

function formatReasons(status: CliLifecycleStatus): string {
  const reasons = status.dependency_summary?.blocking_reasons ?? []
  if (reasons.length > 0) return reasons.join('; ')

  const counts = status.dependency_summary?.counts ?? {}
  const entries = Object.entries(counts).filter(([, count]) => Number(count) > 0)
  if (entries.length === 0) return 'none'
  return entries.map(([key, count]) => `${count} ${key.replaceAll('_', ' ')}`).join('; ')
}

export function printLifecycleStatus(status: CliLifecycleStatus, json = false): void {
  if (json) {
    printJson(status)
    return
  }

  printTable(
    ['Field', 'Value'],
    [
      ['Type', status.artifact_type],
      ['ID', status.artifact_id],
      ['State', status.state],
      ['Visibility', status.visibility ?? '—'],
      ['Pinned', status.pinned ? 'yes' : 'no'],
      ['Archived At', status.archived_at ?? '—'],
      ['Deleted At', status.deleted_at ?? '—'],
      ['Version', status.version_id ?? '—'],
      ['Snapshot Hash', status.snapshot_hash ?? '—'],
      ['Dependencies', String(status.dependency_summary?.total ?? 0)],
      ['Blocking Reasons', formatReasons(status)],
    ]
  )
}

const LIFECYCLE_RPC: Record<CliLifecycleAction, string> = {
  status: 'fn_artifact_lifecycle_status',
  archive: 'fn_artifact_archive',
  restore: 'fn_artifact_restore',
  delete: 'fn_artifact_delete',
  pin: 'fn_artifact_pin',
  unpin: 'fn_artifact_pin',
}

/**
 * Creates a citty subcommand that runs a single lifecycle action for a given artifact type.
 * @param artifactType - The artifact type (lens, workflow, battle, agent)
 * @param action - The lifecycle action to run
 * @param description - Command description shown in help output
 * @param idDescription - Description for the positional ID argument
 */
export function makeLifecycleCommand(
  artifactType: CliArtifactType,
  action: CliLifecycleAction,
  description: string,
  idDescription = `${artifactType[0].toUpperCase()}${artifactType.slice(1)} UUID`,
) {
  return defineCommand({
    meta: { name: action === 'status' ? 'lifecycle' : action, description },
    args: {
      id: { type: 'positional', description: idDescription, required: true },
      json: { type: 'boolean', description: 'Output as JSON', default: false },
    },
    async run({ args }) {
      try {
        await runLifecycleAction(artifactType, args.id, action, args.json)
      } catch (err) {
        handleError(err)
      }
    },
  })
}

export async function runLifecycleAction(
  artifactType: CliArtifactType,
  artifactId: string,
  action: CliLifecycleAction,
  json = false
): Promise<void> {
  const rpcName = LIFECYCLE_RPC[action]

  const payload: Record<string, unknown> = {
    p_artifact_type: artifactType,
    p_artifact_id: artifactId,
  }
  if (action === 'pin') payload.p_pin = true
  if (action === 'unpin') payload.p_pin = false

  const status = await callRpc<CliLifecycleStatus>(rpcName, payload, { requireAuth: true })

  if (json) {
    printJson(status)
    return
  }

  const verb =
    action === 'status' ? 'Lifecycle status'
    : action === 'delete' ? 'Delete request applied'
    : action === 'pin' ? 'Pinned'
    : action === 'unpin' ? 'Unpinned'
    : `${action[0].toUpperCase()}${action.slice(1)}d`

  consola.success('%s: %s %s', verb, artifactType, artifactId)
  if (action === 'delete' && status.delete_mode === 'tombstone') {
    consola.info('Historical dependencies were preserved. The artifact was tombstoned instead of hard-deleted.')
  }
  if ((status.dependency_summary?.total ?? 0) > 0 && action === 'delete') {
    consola.info('Reason: %s', formatReasons(status))
  }
  if (action === 'status') {
    printLifecycleStatus(status, false)
  }
}
