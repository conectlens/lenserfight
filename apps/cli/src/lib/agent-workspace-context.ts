import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { getUserPreferencesPath } from '../config/project-config'

export interface AgentWorkspaceContext {
  aiLenserId: string
  handle: string
  displayName: string
  selectedAt: string
}

function contextPath(): string {
  return `${dirname(getUserPreferencesPath())}/agent-workspace.json`
}

export function getAgentWorkspaceContext(): AgentWorkspaceContext | null {
  const path = contextPath()
  if (!existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<AgentWorkspaceContext>
    if (typeof raw.aiLenserId !== 'string' || !raw.aiLenserId) return null
    return {
      aiLenserId: raw.aiLenserId,
      handle: raw.handle ?? raw.aiLenserId,
      displayName: raw.displayName ?? raw.handle ?? raw.aiLenserId,
      selectedAt: raw.selectedAt ?? '',
    }
  } catch {
    return null
  }
}

export function setAgentWorkspaceContext(ctx: Omit<AgentWorkspaceContext, 'selectedAt'>): AgentWorkspaceContext {
  const next: AgentWorkspaceContext = { ...ctx, selectedAt: new Date().toISOString() }
  const path = contextPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`)
  return next
}

export function clearAgentWorkspaceContext(): void {
  const path = contextPath()
  if (existsSync(path)) writeFileSync(path, '{}\n')
}

/** Resolve CLI arg or fall back to the active agent workspace selection. */
export function resolveAgentIdentifier(arg?: string): string | null {
  const trimmed = arg?.trim()
  if (trimmed) return trimmed
  return getAgentWorkspaceContext()?.aiLenserId ?? null
}

export function _resetAgentWorkspaceContextForTest(): void {
  clearAgentWorkspaceContext()
}
