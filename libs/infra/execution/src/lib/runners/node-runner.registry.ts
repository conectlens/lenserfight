/**
 * NodeRunnerRegistry — GRASP Pure Fabrication.
 *
 * Resolves the correct INodeRunner implementation for a given WorkflowNodeType.
 * Separates runner lookup from execution, enabling:
 * - Open/Closed: add new runners without modifying this file (call register()).
 * - Protected Variations: callers are shielded from concrete runner imports.
 * - Testability: swap runners in tests via register().
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner } from './node-runner.interface'

const runners = new Map<WorkflowNodeType, INodeRunner>()

/**
 * Register a node runner for a given type. Overwrites any previous registration.
 * Call at application startup to wire all available runners.
 */
export function registerNodeRunner(runner: INodeRunner): void {
  runners.set(runner.nodeType, runner)
}

/**
 * Retrieve the runner for a node type, or undefined if none registered.
 * The engine falls back to the standard provider pipeline when no runner exists.
 */
export function getNodeRunner(nodeType: WorkflowNodeType): INodeRunner | undefined {
  return runners.get(nodeType)
}

/**
 * Check whether a node type has a dedicated runner registered.
 */
export function hasNodeRunner(nodeType: WorkflowNodeType): boolean {
  return runners.has(nodeType)
}

/**
 * Remove all registered runners. Useful for test isolation.
 */
export function clearNodeRunners(): void {
  runners.clear()
}

/**
 * List all currently registered node types. Debug utility.
 */
export function registeredNodeTypes(): WorkflowNodeType[] {
  return [...runners.keys()]
}
