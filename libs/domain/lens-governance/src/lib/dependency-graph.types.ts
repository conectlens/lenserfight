import type { DependencyBinding } from './parameter-contract.types'

export interface DependencyEdge {
  parent_content_hash: string
  child_content_hash: string
  binding: DependencyBinding
  depth: number
  metadata?: Record<string, unknown> | null
}
