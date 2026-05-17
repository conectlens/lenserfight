/**
 * LenserBattlePolicyPanel — Lenser Battle memory and instruction policy.
 *
 * Appears in the Config step when `battleFormat === 'lenser_battle'`.
 * Controls how AI Lenser memory, instructions, and model bindings affect
 * the battle. Each option has clear labels and explanations so creators
 * understand the fairness implications.
 */

import { Tooltip } from '@lenserfight/ui/components'
import {
  type LenserBattlePolicy,
  type MemoryMode,
  type InstructionDisclosure,
  MEMORY_MODES,
  MEMORY_MODE_LABELS,
  MEMORY_MODE_DESCRIPTIONS,
  INSTRUCTION_DISCLOSURES,
  INSTRUCTION_DISCLOSURE_LABELS,
  INSTRUCTION_DISCLOSURE_DESCRIPTIONS,
} from '@lenserfight/domain/battle-governance'
import { Brain, Eye, Info } from 'lucide-react'
import React from 'react'

export interface LenserBattlePolicyPanelProps {
  value: LenserBattlePolicy
  onChange: (policy: LenserBattlePolicy) => void
}

export const LenserBattlePolicyPanel: React.FC<LenserBattlePolicyPanelProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="space-y-5">
      {/* ── Memory Mode ────────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-1.5">
          <Brain size={14} className="text-greyscale-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
            AI Memory Mode
          </h4>
          <Tooltip
            content="Controls whether AI Lensers can use their stored memory, instructions, and persona during this battle."
            position="right"
            contentClassName="whitespace-normal w-60 text-[11px]"
          >
            <Info size={13} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MEMORY_MODES.map((mode) => {
            const isSelected = value.memory_mode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...value, memory_mode: mode as MemoryMode })}
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-greyscale-900 bg-greyscale-900/[0.04] dark:border-greyscale-0 dark:bg-greyscale-0/[0.06]'
                    : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                }`}
              >
                <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
                  {MEMORY_MODE_LABELS[mode]}
                </p>
                <p className="mt-0.5 text-[10px] text-greyscale-400 leading-snug">
                  {MEMORY_MODE_DESCRIPTIONS[mode]}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Instruction Disclosure ──────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-1.5">
          <Eye size={14} className="text-greyscale-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-greyscale-400">
            Instruction Visibility
          </h4>
          <Tooltip
            content="Controls when voters can see the AI Lensers' system prompts and instructions."
            position="right"
            contentClassName="whitespace-normal w-56 text-[11px]"
          >
            <Info size={13} className="text-greyscale-400 hover:text-greyscale-600 cursor-default" />
          </Tooltip>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {INSTRUCTION_DISCLOSURES.map((disclosure) => {
            const isSelected = value.instruction_disclosure === disclosure
            return (
              <button
                key={disclosure}
                type="button"
                onClick={() =>
                  onChange({ ...value, instruction_disclosure: disclosure as InstructionDisclosure })
                }
                className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-greyscale-900 bg-greyscale-900/[0.04] dark:border-greyscale-0 dark:bg-greyscale-0/[0.06]'
                    : 'border-surface-border hover:border-greyscale-300 dark:hover:border-greyscale-600'
                }`}
              >
                <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
                  {INSTRUCTION_DISCLOSURE_LABELS[disclosure]}
                </p>
                <p className="mt-0.5 text-[10px] text-greyscale-400 leading-snug">
                  {INSTRUCTION_DISCLOSURE_DESCRIPTIONS[disclosure]}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Model Binding Override ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-surface-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50">
            Allow model override
          </p>
          <p className="text-[10px] text-greyscale-400 mt-0.5">
            Let contenders override their default model binding for this battle.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.model_binding_override}
          onClick={() => onChange({ ...value, model_binding_override: !value.model_binding_override })}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            value.model_binding_override ? 'bg-primary-yellow-500' : 'bg-greyscale-200 dark:bg-greyscale-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              value.model_binding_override ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
