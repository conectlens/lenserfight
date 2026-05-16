/**
 * WorkflowUtilityNodeConfig — registry-driven config shell for non-lens nodes.
 *
 * Uses the RunnerConfigRegistry to dispatch to either:
 * - A declarative descriptor (rendered by DescriptorFormRenderer)
 * - A custom React component (for complex UIs)
 *
 * Design:
 * - GRASP Polymorphism: each runner type provides its own config surface.
 * - Protected Variations: new runners are added by registering in bootstrap,
 *   without modifying this component.
 * - Pure Fabrication: the registry decouples this shell from concrete runners.
 */

import { isWorkflowUtilityNodeType } from '@lenserfight/infra/execution'
import React, { useEffect } from 'react'

import { bootstrapRunnerConfigs } from '../config/runner-config.bootstrap'
import { getRunnerConfig } from '../config/runner-config.registry'
import { ConfigPanelShell } from '../config/shared/ConfigPanelShell'
import { DescriptorFormRenderer } from '../config/shared/DescriptorFormRenderer'
import { FundingSection } from '../config/shared/FundingSection'
import { InputMappingSection } from '../config/shared/InputMappingSection'
import { OutputContractSection } from '../config/shared/OutputContractSection'
import { WorkflowUpstreamOutputPanel } from './upstream/WorkflowUpstreamOutputPanel'
import { useUpstreamNodeOutputs } from '../hooks/useUpstreamNodeOutputs'

import type { WorkflowNodeConfig } from '../types'
import type { WorkflowNodeRecord, WorkflowEdgeRecord, WorkflowNodeResultRecord } from '@lenserfight/data/repositories'

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * GRASP Protected Variations: callers use this to decide which config panel
 * to render without knowing the full set of utility types.
 */
export function isUtilityNode(nodeType?: string): boolean {
  return isWorkflowUtilityNodeType(nodeType)
}

// ── Props ───────────────────────────────────────────────────────────────────

interface WorkflowUtilityNodeConfigProps {
  nodeId: string
  nodeLabel: string
  currentConfig: WorkflowNodeConfig
  nodes: WorkflowNodeRecord[]
  edges: WorkflowEdgeRecord[]
  /** Latest execution results for upstream output inspection panel */
  nodeResults: WorkflowNodeResultRecord[]
  onSave: (nodeId: string, config: WorkflowNodeConfig) => void
  onClose: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function WorkflowUtilityNodeConfig({
  nodeId,
  nodeLabel,
  currentConfig,
  nodes,
  edges,
  nodeResults,
  onSave,
  onClose,
}: WorkflowUtilityNodeConfigProps) {
  // Ensure registry is populated
  useEffect(() => { bootstrapRunnerConfigs() }, [])

  const nodeType = currentConfig.node_type ?? currentConfig.nodeType ?? 'code'
  const entry = getRunnerConfig(nodeType)

  const upstreamOutputs = useUpstreamNodeOutputs({ nodeId, edges, nodes, nodeResults })
  const hasRun = nodeResults.length > 0

  // Fallback: no config registered for this type
  if (!entry) {
    return (
      <ConfigPanelShell nodeLabel={nodeLabel} nodeType={nodeType} onClose={onClose}>
        <WorkflowUpstreamOutputPanel upstreamOutputs={upstreamOutputs} hasRun={hasRun} />
        <div className="rounded-xl border border-surface-border bg-surface-raised p-4 text-center text-xs text-greyscale-400">
          No configuration available for <span className="font-mono">{nodeType}</span> nodes yet.
        </div>
      </ConfigPanelShell>
    )
  }

  // Custom form component
  if (entry.kind === 'custom') {
    return (
      <ConfigPanelShell nodeLabel={nodeLabel} nodeType={nodeType} onClose={onClose}>
        <InputMappingSection nodeId={nodeId} nodes={nodes} edges={edges} />
        <WorkflowUpstreamOutputPanel upstreamOutputs={upstreamOutputs} hasRun={hasRun} />
        <entry.component
          nodeId={nodeId}
          config={currentConfig}
          nodes={nodes}
          edges={edges}
          onSave={onSave}
          onClose={onClose}
        />
      </ConfigPanelShell>
    )
  }

  // Declarative descriptor
  const { descriptor } = entry
  return (
    <ConfigPanelShell nodeLabel={nodeLabel} nodeType={nodeType} onClose={onClose}>
      <InputMappingSection nodeId={nodeId} nodes={nodes} edges={edges} />
      <WorkflowUpstreamOutputPanel upstreamOutputs={upstreamOutputs} hasRun={hasRun} />
      {descriptor.needsAiProvider && (
        <FundingSection config={currentConfig} onConfigChange={() => {}} />
      )}
      <DescriptorFormRenderer
        descriptor={descriptor}
        config={currentConfig}
        nodeId={nodeId}
        onSave={onSave}
        onClose={onClose}
      />
      <OutputContractSection outputs={descriptor.outputFields} />
    </ConfigPanelShell>
  )
}
