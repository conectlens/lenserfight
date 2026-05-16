/**
 * RunnerConfigRegistry — UI-side registry for runner config descriptors and custom forms.
 *
 * Mirrors the execution-layer NodeRunnerRegistry pattern (GRASP Pure Fabrication).
 * Maps WorkflowNodeType → descriptor (declarative) or custom React component.
 */

import type React from 'react'

import type { RunnerConfigDescriptor, RunnerConfigFormProps } from '../types'

export type RunnerConfigEntry =
  | { kind: 'descriptor'; descriptor: RunnerConfigDescriptor }
  | { kind: 'custom'; component: React.ComponentType<RunnerConfigFormProps> }

const registry = new Map<string, RunnerConfigEntry>()

export function registerRunnerConfig(nodeType: string, entry: RunnerConfigEntry): void {
  registry.set(nodeType, entry)
}

export function getRunnerConfig(nodeType: string): RunnerConfigEntry | undefined {
  return registry.get(nodeType)
}

export function hasRunnerConfig(nodeType: string): boolean {
  return registry.has(nodeType)
}

export function clearRunnerConfigs(): void {
  registry.clear()
}

export function registeredRunnerTypes(): string[] {
  return Array.from(registry.keys())
}
