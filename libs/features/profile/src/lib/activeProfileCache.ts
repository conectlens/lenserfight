import { LENSER_CACHE_KEY } from '@lenserfight/features/auth'
import { storage } from '@lenserfight/utils/storage'

import type { WorkspaceIdentity } from '@lenserfight/types'

const SIDEBAR_PROFILE_CACHE_PREFIX = 'sidebar_profile_'
const ACTIVE_WORKSPACE_KEY = 'lf_active_workspace_id'
const WORKSPACE_SNAPSHOT_KEY = 'lf_workspaces_v1'

export function getStoredActiveWorkspaceId(): string | null {
  return storage.getItem(ACTIVE_WORKSPACE_KEY)
}

export function storeActiveWorkspaceId(id: string | null): void {
  if (id) {
    storage.setItem(ACTIVE_WORKSPACE_KEY, id)
  } else {
    storage.removeItem(ACTIVE_WORKSPACE_KEY)
  }
}

interface WorkspaceSnapshot {
  savedAt: number
  userId: string
  profiles: WorkspaceIdentity[]
}

export function getStoredWorkspaceSnapshot(userId: string): WorkspaceIdentity[] | null {
  try {
    const raw = storage.getItem(WORKSPACE_SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as WorkspaceSnapshot
    // Reject snapshots that belong to a different user
    if (parsed.userId !== userId) return null
    return parsed.profiles
  } catch {
    return null
  }
}

export function storeWorkspaceSnapshot(userId: string, profiles: WorkspaceIdentity[]): void {
  storage.setItem(
    WORKSPACE_SNAPSHOT_KEY,
    JSON.stringify({ savedAt: Date.now(), userId, profiles })
  )
}

export function clearActiveProfileCaches(): void {
  storage.removeItem(LENSER_CACHE_KEY)
  // Workspace snapshot and ACTIVE_WORKSPACE_KEY are user workspace-selection state,
  // not profile caches — they must survive a cache flush so the switch persists on reload.

  for (const key of storage.keys()) {
    if (key.startsWith(SIDEBAR_PROFILE_CACHE_PREFIX)) {
      storage.removeItem(key)
    }
  }
}

export function clearAllWorkspaceCaches(): void {
  storage.removeItem(LENSER_CACHE_KEY)
  storage.removeItem(ACTIVE_WORKSPACE_KEY)
  storage.removeItem(WORKSPACE_SNAPSHOT_KEY)

  for (const key of storage.keys()) {
    if (key.startsWith(SIDEBAR_PROFILE_CACHE_PREFIX)) {
      storage.removeItem(key)
    }
  }
}
