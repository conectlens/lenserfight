import { getWorkflowNodeCatalogEntry } from './workflow-node-catalog'

import type { WorkflowNodeConfig } from '../workflow-execution.service'
import type { WorkflowNodeType } from '../execution.types'
import type { WorkflowNodeConfigField } from './workflow-node-catalog'

export type ExecutableWorkflowNodeConfig = WorkflowNodeConfig & Record<string, unknown>

export function normalizeWorkflowNodeConfigForExecution(
  raw: Record<string, unknown> | null | undefined,
): ExecutableWorkflowNodeConfig | undefined {
  if (!raw) return undefined

  const nodeType = readString(raw['nodeType']) ?? readString(raw['node_type'])
  const entry = getWorkflowNodeCatalogEntry(nodeType)
  const configFields = [...(entry?.requiredConfig ?? []), ...(entry?.optionalConfig ?? [])]
  const normalized: ExecutableWorkflowNodeConfig = {}

  copyKnownExecutionPolicy(raw, normalized)

  if (entry && entry.type !== 'lens') {
    normalized.nodeType = entry.type as WorkflowNodeType
    normalized.node_type = entry.type
  }

  const modelId = readString(raw['modelId']) ?? readString(raw['model_id'])
  if (modelId) {
    normalized.modelId = modelId
    normalized.model_id = modelId
  }

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'param_overrides') continue
    if (key in normalized) continue
    normalized[key] = normalizeConfigValue(key, value, configFields)
  }

  const overrides = raw['param_overrides']
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const [rawKey, value] of Object.entries(overrides as Record<string, unknown>)) {
      const key = rawKey.startsWith('__') ? rawKey.slice(2) : rawKey
      if (!key || key in normalized) continue
      normalized[key] = normalizeConfigValue(key, value, configFields)
    }
  }

  return Object.keys(normalized).length ? normalized : undefined
}

function copyKnownExecutionPolicy(
  raw: Record<string, unknown>,
  target: ExecutableWorkflowNodeConfig,
): void {
  if (raw['retry'] && typeof raw['retry'] === 'object') {
    target.retry = raw['retry'] as WorkflowNodeConfig['retry']
  }
  if (typeof raw['timeoutMs'] === 'number') target.timeoutMs = raw['timeoutMs']
  if (typeof raw['onParentFailure'] === 'string') {
    target.onParentFailure = raw['onParentFailure'] as WorkflowNodeConfig['onParentFailure']
  }
  if (typeof raw['merge'] === 'string') {
    target.merge = raw['merge'] as WorkflowNodeConfig['merge']
  }
  if (typeof raw['moderation'] === 'string') {
    target.moderation = raw['moderation'] as WorkflowNodeConfig['moderation']
  }
  if (typeof raw['memoryWritePolicy'] === 'string') {
    target.memoryWritePolicy = raw['memoryWritePolicy'] as WorkflowNodeConfig['memoryWritePolicy']
  }
  if (typeof raw['delegationPolicy'] === 'string') {
    target.delegationPolicy = raw['delegationPolicy'] as WorkflowNodeConfig['delegationPolicy']
  }
}

function normalizeConfigValue(
  key: string,
  value: unknown,
  fields: WorkflowNodeConfigField[],
): unknown {
  const descriptor = fields.find((field) => field.key === key)
  if (!descriptor) return parseLooseValue(value)

  switch (descriptor.kind) {
    case 'number':
      return typeof value === 'number' ? value : Number(value)
    case 'boolean':
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.trim().toLowerCase() === 'true'
      return Boolean(value)
    case 'json':
    case 'string[]':
      return parseJsonValue(value)
    case 'secret':
    case 'select':
    case 'string':
    case 'template':
      return typeof value === 'string' ? value : String(value)
  }
}

function parseLooseValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return value
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return parseJsonValue(trimmed)
  }
  return value
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
