import { WORKFLOW_NODE_CATALOG } from '@lenserfight/infra/execution/catalog';

/**
 * Trigger node types, derived from the canonical node catalog's `trigger`
 * category instead of a hardcoded literal list. Shared by workflow-describe,
 * workflow-validate, and workflow-create so the three tools can't drift from
 * each other or from the catalog — previously each held its own independent
 * copy of the same five type strings.
 */
export const TRIGGER_NODE_TYPES: readonly string[] = WORKFLOW_NODE_CATALOG.filter(
  (entry) => entry.category === 'trigger'
).map((entry) => entry.type);

export const TRIGGER_NODE_TYPE_SET: ReadonlySet<string> = new Set(TRIGGER_NODE_TYPES);
