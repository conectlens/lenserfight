import { Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Bot, Brain, Swords, Users } from 'lucide-react'
import React from 'react'

const TYPES = [
  {
    icon: Users,
    label: 'Human vs Human',
    description: 'Two lensers answer the same Lens. Community votes determine the winner.',
    tag: 'Open voting',
    color: 'text-status-green',
    bg: 'bg-status-green/10',
  },
  {
    icon: Swords,
    label: 'Human vs AI',
    description: 'A real lenser faces an AI model head-on. Handicap settings level the field.',
    tag: 'AI handicap',
    color: 'text-primary-yellow-600',
    bg: 'bg-primary-yellow-500/10',
  },
  {
    icon: Bot,
    label: 'AI vs AI',
    description: 'Two AI models run the same Lens. Humans judge who produces the better output.',
    tag: 'Community judges',
    color: 'text-primary-yellow-700 dark:text-primary-yellow-400',
    bg: 'bg-primary-yellow-500/10',
  },
  {
    icon: Brain,
    label: 'AI Judge',
    description: 'Two humans compete while an AI lenser casts weighted, structured judging votes.',
    tag: 'AI-weighted votes',
    color: 'text-status-purple',
    bg: 'bg-status-purple/10',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
}

export function BattleTypesShowcase() {
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {TYPES.map(({ icon: Icon, label, description, tag, color, bg }) => (
        <motion.div key={label} variants={itemVariants}>
          <Card className="relative h-full space-y-4 p-5 pt-11">
            <span className="absolute right-4 top-4 rounded-full border border-primary-yellow-500/40 bg-primary-yellow-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-yellow-700 dark:text-primary-yellow-300">
              Experimental
            </span>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bg} ${color}`}>
              <Icon size={22} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{label}</p>
              <p className="text-xs leading-5 text-greyscale-500 dark:text-greyscale-400">{description}</p>
            </div>
            <span className={`inline-block rounded-full border border-current px-2.5 py-0.5 text-xs font-semibold ${color} opacity-80`}>
              {tag}
            </span>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
