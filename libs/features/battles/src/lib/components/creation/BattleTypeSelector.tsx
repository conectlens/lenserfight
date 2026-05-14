import { HelpButton } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Bot, Brain, GitBranch, Swords, Trophy, Users } from 'lucide-react'
import React from 'react'

import type { BattleType } from '../../types/battle.types'

interface BattleTypeSelectorProps {
  value: BattleType
  onChange: (type: BattleType) => void
}

const TYPES: {
  value: BattleType
  icon: React.ReactNode
  label: string
  description: string
  defaultEligibility: string
  docsPath: string
}[] = [
  {
    value: 'human_vs_human_open_votes',
    icon: <Users size={20} />,
    label: 'Human vs Human',
    description: 'Two human lensers compete. The community votes openly.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#human-vs-human',
  },
  {
    value: 'human_vs_ai',
    icon: <Swords size={20} />,
    label: 'Human vs AI',
    description: 'Direct face-off between a human lenser and an AI model. Everyone can vote.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#human-vs-ai',
  },
  {
    value: 'ai_vs_ai',
    icon: <Bot size={20} />,
    label: 'AI vs AI',
    description: 'Two AI models compete on the same Lens. The community judges the outputs.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#ai-vs-ai',
  },
  {
    value: 'human_vs_human_ai_votes',
    icon: <Brain size={20} />,
    label: 'AI Judge',
    description: 'Two humans compete. An AI lenser casts weighted judging votes.',
    defaultEligibility: 'AI judge only',
    docsPath: '/how-to/battles/battle-types#ai-judge',
  },
  {
    value: 'workflow_battle',
    icon: <GitBranch size={20} />,
    label: 'Workflow Battle',
    description: 'Chain your lenses into a multi-step workflow and compete end-to-end.',
    defaultEligibility: 'Open voting',
    docsPath: '/how-to/battles/battle-types#workflow-battle',
  },
  {
    value: 'lenser_battle',
    icon: <Trophy size={20} />,
    label: 'Lenser Battle',
    description: 'Named lensers compete using their own lens, model, and funding setup.',
    defaultEligibility: 'Configurable voting',
    docsPath: '/how-to/battles/battle-types#lenser-battle',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
}

export function BattleTypeSelector({ value, onChange }: BattleTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
        Battle type
      </label>
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {TYPES.map((t) => {
          const isSelected = value === t.value
          return (
            <motion.button
              key={t.value}
              type="button"
              variants={cardVariants}
              onClick={() => onChange(t.value)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? 'border-greyscale-900 bg-greyscale-900 text-greyscale-0 dark:border-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                  : 'border-surface-border bg-surface-base hover:border-primary-yellow-500'
              }`}
              aria-pressed={isSelected}
            >
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${
                isSelected ? 'bg-greyscale-0/15 dark:bg-greyscale-900/15' : 'bg-surface-raised'
              }`}>
                {t.icon}
              </div>
              <p className="text-sm font-bold">{t.label}</p>
              <p className={`mt-1 text-xs leading-5 ${
                isSelected ? 'opacity-80' : 'text-greyscale-500 dark:text-greyscale-400'
              }`}>
                {t.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className={`text-xs font-semibold ${
                  isSelected ? 'opacity-60' : 'text-primary-yellow-600'
                }`}>
                  {t.defaultEligibility}
                </p>
                <span onClick={(e) => e.stopPropagation()}>
                  <HelpButton
                    path={t.docsPath}
                    label="Learn more"
                    className={isSelected ? 'opacity-60 hover:opacity-100' : ''}
                  />
                </span>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
