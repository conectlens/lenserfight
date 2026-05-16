/**
 * Lenser Battle policy types.
 *
 * A Lenser Battle differs from a Lens Battle: contenders compete as named
 * Lensers using their own identity, memory, instructions, model setup, and
 * tools. This policy controls how those personal assets affect the battle.
 */

// ─── Memory Mode ─────────────────────────────────────────────────────────────
// Controls whether AI Lensers use their stored memory and instructions.

export const MEMORY_MODES = ['clean_room', 'personality', 'unrestricted'] as const
export type MemoryMode = (typeof MEMORY_MODES)[number]

export const MEMORY_MODE_LABELS: Record<MemoryMode, string> = {
  clean_room: 'Clean Room',
  personality: 'Personality',
  unrestricted: 'Unrestricted',
}

export const MEMORY_MODE_DESCRIPTIONS: Record<MemoryMode, string> = {
  clean_room:
    'AI Lensers start with a blank slate — no stored memory or instructions. Best for benchmarks and fair comparisons.',
  personality:
    'AI Lensers use their persona, style, and instructions but not conversation memory. Default for most battles.',
  unrestricted:
    'AI Lensers use all stored memory, instructions, tools, and connectors. Best for showcasing Lenser capabilities.',
}

// ─── Instruction Disclosure ──────────────────────────────────────────────────
// Controls when AI Lenser instructions/system prompts are visible to voters.

export const INSTRUCTION_DISCLOSURES = ['hidden', 'visible_after_close', 'always_visible'] as const
export type InstructionDisclosure = (typeof INSTRUCTION_DISCLOSURES)[number]

export const INSTRUCTION_DISCLOSURE_LABELS: Record<InstructionDisclosure, string> = {
  hidden: 'Hidden',
  visible_after_close: 'Visible after close',
  always_visible: 'Always visible',
}

export const INSTRUCTION_DISCLOSURE_DESCRIPTIONS: Record<InstructionDisclosure, string> = {
  hidden:
    'AI Lenser instructions and system prompts are never shown to voters or the public.',
  visible_after_close:
    'Instructions are revealed after voting closes. Voters judge output quality without knowing the instructions.',
  always_visible:
    'Instructions are visible during voting. Voters can assess both the output and the approach.',
}

// ─── Lenser Battle Policy ────────────────────────────────────────────────────

export interface LenserBattlePolicy {
  /** Controls AI Lenser memory and instruction usage during the battle. */
  memory_mode: MemoryMode
  /** Controls when AI Lenser instructions are visible to voters. */
  instruction_disclosure: InstructionDisclosure
  /** Whether contenders can override their default model binding for this battle. */
  model_binding_override: boolean
}

export const DEFAULT_LENSER_BATTLE_POLICY: LenserBattlePolicy = {
  memory_mode: 'personality',
  instruction_disclosure: 'visible_after_close',
  model_binding_override: false,
}
