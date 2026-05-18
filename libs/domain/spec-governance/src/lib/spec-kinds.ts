/**
 * LenserFight Spec Kind Registry.
 *
 * Canonical list of spec kinds recognized by the LenserFight platform.
 * Each kind maps to a Markdown filename convention, a description, and the
 * required frontmatter sections expected by the validator.
 *
 * GRASP: Information Expert — owns all knowledge about what kinds exist and
 * what each kind requires. CLI, validators, and documentation generators read
 * from here; they never invent their own kind lists.
 */

// ─── Kind values ─────────────────────────────────────────────────────────────

export const SPEC_KINDS = [
  'Lens',
  'Lenser',
  'CoLens',
  'Battle',
  'Ray',
  'Team',
  'Agent',
  'AgentTeam',
  'Tool',
  'Workflow',
  'PrivateBattle',
  'Skill',
  'MemoryPolicy',
  'Evaluation',
  'Execution',
  'RunReport',
  'Dataset',
  'Benchmark',
] as const

export type SpecKind = (typeof SPEC_KINDS)[number]

// ─── Automation kind → Spec kind mapping ─────────────────────────────────────

/**
 * Maps the lowercase `kind` field in YAML frontmatter (AutomationObjectKind)
 * to the PascalCase SpecKind used in the versioned spec format.
 *
 * This supports both legacy files (kind: lens) and new-format files
 * (kind: Lens) via the normalizer.
 */
export const AUTOMATION_KIND_TO_SPEC_KIND: Record<string, SpecKind> = {
  lens: 'Lens',
  lenser: 'Lenser',
  colens: 'CoLens',
  battle: 'Battle',
  ray: 'Ray',
  team: 'Team',
  agent: 'Agent',
  agent_team: 'AgentTeam',
  tool: 'Tool',
  workflow: 'Workflow',
  private_battle: 'PrivateBattle',
  skill: 'Skill',
  memory_policy: 'MemoryPolicy',
  evaluation: 'Evaluation',
  execution: 'Execution',
  run_report: 'RunReport',
  dataset: 'Dataset',
  benchmark: 'Benchmark',
  // PascalCase (new-format) pass-through
  Lens: 'Lens',
  Lenser: 'Lenser',
  CoLens: 'CoLens',
  Battle: 'Battle',
  Ray: 'Ray',
  Team: 'Team',
  Agent: 'Agent',
  AgentTeam: 'AgentTeam',
  Tool: 'Tool',
  Workflow: 'Workflow',
  PrivateBattle: 'PrivateBattle',
  Skill: 'Skill',
  MemoryPolicy: 'MemoryPolicy',
  Evaluation: 'Evaluation',
  Execution: 'Execution',
  RunReport: 'RunReport',
  Dataset: 'Dataset',
  Benchmark: 'Benchmark',
}

export function normalizeSpecKind(kind: string): SpecKind | undefined {
  return AUTOMATION_KIND_TO_SPEC_KIND[kind]
}

// ─── Kind metadata ────────────────────────────────────────────────────────────

export interface SpecKindMeta {
  /** PascalCase kind name used in `apiVersion` format. */
  kind: SpecKind
  /** Legacy lowercase kind name used in `schema_version` format. */
  legacyKind: string
  /** Canonical Markdown file name. */
  fileName: string
  /** Human-readable description of the kind. */
  description: string
  /** Required top-level frontmatter keys. */
  requiredFields: readonly string[]
  /** Required Markdown section headings. */
  requiredSections: readonly string[]
  /** Whether this kind is executable by the runtime. */
  executable: boolean
  /** Whether this kind supports content hashing for reproducibility. */
  hashable: boolean
  /** Whether specs of this kind can be publicly forked/remixed. */
  forkable: boolean
}

export const SPEC_KIND_META: Record<SpecKind, SpecKindMeta> = {
  Lens: {
    kind: 'Lens',
    legacyKind: 'lens',
    fileName: 'LENS.MD',
    description:
      'A reusable, versioned prompt contract with typed inputs and outputs. The fundamental executable unit of LenserFight.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Prompt', 'Inputs', 'Outputs'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  Lenser: {
    kind: 'Lenser',
    legacyKind: 'lenser',
    fileName: 'LENSER.MD',
    description:
      'An AI agent with a defined mission, tool policy, and operating rules. Runs lenses and coordinates with other lensers.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Mission', 'Activation', 'Operating Rules'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  CoLens: {
    kind: 'CoLens',
    legacyKind: 'colens',
    fileName: 'COLENS.MD',
    description:
      'A multi-step workflow DAG that chains lenses and lensers. Supports sequential, parallel, and conditional execution.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Inputs', 'Steps', 'Outputs'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  Battle: {
    kind: 'Battle',
    legacyKind: 'battle',
    fileName: 'BATTLE.MD',
    description:
      'A public comparison template between lenses, lensers, workflows, or models. Supports AI-vs-AI, human-vs-human, and human-vs-AI structures.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Participants', 'Evaluation', 'Report'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  Ray: {
    kind: 'Ray',
    legacyKind: 'ray',
    fileName: 'RAY.MD',
    description:
      'A thematic category that groups related lenses, lensers, colenses, and battles for discovery.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Related Items', 'Routing'],
    executable: false,
    hashable: false,
    forkable: false,
  },
  Team: {
    kind: 'Team',
    legacyKind: 'team',
    fileName: 'TEAM.MD',
    description:
      'A coordinated group of lensers with shared tools, responsibilities, and collaboration rules.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Team Purpose', 'LENSERS', 'Collaboration Rules'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  Agent: {
    kind: 'Agent',
    legacyKind: 'agent',
    fileName: 'AGENT.md',
    description:
      'A structured AI agent definition (legacy alias for Lenser). Prefer Lenser for new specs.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Purpose', 'Instructions', 'Execution Policy'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  AgentTeam: {
    kind: 'AgentTeam',
    legacyKind: 'agent_team',
    fileName: 'AGENT_TEAM.md',
    description:
      'A multi-agent team with a defined lead agent, member roster, and collaboration rules.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Team Purpose', 'Members', 'Collaboration Rules'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  Tool: {
    kind: 'Tool',
    legacyKind: 'tool',
    fileName: 'TOOL.md',
    description:
      'A registered external capability (API, service, or local action) that lensers can invoke.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Capability Description', 'Inputs', 'Outputs', 'Failure Modes'],
    executable: false,
    hashable: true,
    forkable: false,
  },
  Workflow: {
    kind: 'Workflow',
    legacyKind: 'workflow',
    fileName: 'WORKFLOW.md',
    description:
      'A structured automation workflow (alias for CoLens in agentic contexts). Prefer CoLens for new specs.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Purpose', 'Inputs', 'Steps', 'Outputs'],
    executable: true,
    hashable: true,
    forkable: true,
  },
  PrivateBattle: {
    kind: 'PrivateBattle',
    legacyKind: 'private_battle',
    fileName: 'PRIVATE_BATTLE.md',
    description:
      'A workspace-scoped battle template for internal evaluation. Not publicly discoverable.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Purpose', 'Participants', 'Evaluation', 'Report'],
    executable: true,
    hashable: true,
    forkable: false,
  },
  Skill: {
    kind: 'Skill',
    legacyKind: 'skill',
    fileName: 'SKILL.md',
    description:
      'A reusable method or playbook that a lenser follows when a given context is triggered.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'When To Use', 'Workflow'],
    executable: false,
    hashable: true,
    forkable: true,
  },
  MemoryPolicy: {
    kind: 'MemoryPolicy',
    legacyKind: 'memory_policy',
    fileName: 'MEMORY_POLICY.md',
    description:
      'Defines what a lenser may store, read, and retain in its workspace memory.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Purpose', 'What To Store', 'What Not To Store'],
    executable: false,
    hashable: true,
    forkable: false,
  },
  Evaluation: {
    kind: 'Evaluation',
    legacyKind: 'evaluation',
    fileName: 'EVALUATION.md',
    description:
      'A quality evaluation dataset, rubric, and judging configuration for a battle or workflow.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Purpose', 'Dataset', 'Metrics', 'Judging'],
    executable: false,
    hashable: true,
    forkable: true,
  },
  Execution: {
    kind: 'Execution',
    legacyKind: 'run_report',
    fileName: 'EXECUTION.md',
    description:
      'An immutable snapshot of a completed execution: inputs, outputs, model config, provenance, and content hashes.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Summary', 'Inputs', 'Results'],
    executable: false,
    hashable: true,
    forkable: false,
  },
  RunReport: {
    kind: 'RunReport',
    legacyKind: 'run_report',
    fileName: 'RUN_REPORT.md',
    description:
      'A human-readable simulation report produced by `lf run` or `lf battle simulate`.',
    requiredFields: ['kind', 'name'],
    requiredSections: ['Summary', 'Inputs', 'Results'],
    executable: false,
    hashable: false,
    forkable: false,
  },
  Dataset: {
    kind: 'Dataset',
    legacyKind: 'evaluation',
    fileName: 'DATASET.md',
    description:
      'A reusable set of test cases, prompts, or ground-truth pairs used for evaluation and benchmarking.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Format', 'Examples'],
    executable: false,
    hashable: true,
    forkable: true,
  },
  Benchmark: {
    kind: 'Benchmark',
    legacyKind: 'evaluation',
    fileName: 'BENCHMARK.md',
    description:
      'A reproducible evaluation harness that measures model or agent performance against a fixed dataset.',
    requiredFields: ['kind', 'name', 'description'],
    requiredSections: ['Purpose', 'Dataset', 'Metrics', 'Baseline'],
    executable: true,
    hashable: true,
    forkable: true,
  },
}

export function getSpecKindMeta(kind: SpecKind): SpecKindMeta {
  return SPEC_KIND_META[kind]
}

export function isExecutableKind(kind: SpecKind): boolean {
  return SPEC_KIND_META[kind].executable
}

export function isHashableKind(kind: SpecKind): boolean {
  return SPEC_KIND_META[kind].hashable
}
