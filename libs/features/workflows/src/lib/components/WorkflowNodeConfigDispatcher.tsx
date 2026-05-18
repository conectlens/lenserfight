/**
 * WorkflowNodeConfigDispatcher — GRASP Polymorphism dispatcher.
 *
 * Routes to the correct config panel based on the node's type:
 * - Lens nodes → WorkflowNodeConfigPanel (provider/model/params)
 * - Utility nodes (CN/CO) → WorkflowUtilityNodeConfig (type-specific forms)
 *
 * Design:
 * - Polymorphism: the caller doesn't know which panel renders.
 * - Protected Variations: new node types are added to isUtilityNode()
 *   without modifying the dispatcher or the builder page.
 * - Indirection: separates the "which panel?" decision from the builder.
 */

import React from 'react'

import { WorkflowNodeConfigPanel } from './WorkflowNodeConfigPanel'
import { WorkflowUtilityNodeConfig, isUtilityNode } from './WorkflowUtilityNodeConfig'

import type { WorkflowNodeConfig } from '../types'
import type { WorkflowNodeRecord, WorkflowEdgeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'

interface WorkflowNodeConfigDispatcherProps {
  nodeId: string
  lensId: string
  versionId: string | null | undefined
  nodeLabel: string
  currentUserId?: string
  currentConfig: WorkflowNodeConfig
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  /** Latest node execution results for upstream output display */
  nodeResults?: WorkflowNodeResultRecord[]
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
  onEditLens?: (lensId: string) => void
}

export function WorkflowNodeConfigDispatcher(props: WorkflowNodeConfigDispatcherProps) {
  const nodeType =
    props.currentConfig.node_type ??
    props.currentConfig.nodeType ??
    (props.lensId.startsWith('__utility_') ? props.lensId.replace('__utility_', '') : undefined)

  // Utility nodes get the specialized config panel (by node_type or by placeholder lensId)
  if (isUtilityNode(nodeType) || props.lensId.startsWith('__utility_')) {
    return (
      <WorkflowUtilityNodeConfig
        nodeId={props.nodeId}
        nodeLabel={props.nodeLabel}
        currentConfig={nodeType ? { ...props.currentConfig, node_type: nodeType as WorkflowNodeConfig['node_type'] } : props.currentConfig}
        nodes={props.nodes}
        edges={props.edges}
        nodeResults={props.nodeResults ?? []}
        onSave={props.onSave}
        onClose={props.onClose}
      />
    )
  }

  // Default: Lens config panel (provider, model, version params, funding)
  return <WorkflowNodeConfigPanel {...props} nodeResults={props.nodeResults ?? []} />
}
