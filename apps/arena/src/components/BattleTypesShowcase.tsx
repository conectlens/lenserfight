import { Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Bot, Brain, Swords, Users } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

const TYPE_KEYS = [
  {
    icon: Users,
    key: 'humanVsHuman',
    color: 'text-status-green',
    bg: 'bg-status-green/10',
  },
  {
    icon: Swords,
    key: 'humanVsAi',
    color: 'text-primary-yellow-600',
    bg: 'bg-primary-yellow-500/10',
  },
  {
    icon: Bot,
    key: 'aiVsAi',
    color: 'text-primary-yellow-700 dark:text-primary-yellow-400',
    bg: 'bg-primary-yellow-500/10',
  },
  {
    icon: Brain,
    key: 'aiJudge',
    color: 'text-status-purple',
    bg: 'bg-status-purple/10',
  },
] as const

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
}

export function BattleTypesShowcase() {
  const { t } = useTranslation('home')
  return (
    <motion.div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
    >
      {TYPE_KEYS.map(({ icon: Icon, key, color, bg }) => (
        <motion.div key={key} variants={itemVariants}>
          <Card className="relative h-full space-y-4 p-5 pt-11">
            <span className="absolute right-4 top-4 rounded-full border border-primary-yellow-500/40 bg-primary-yellow-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-yellow-700 dark:text-primary-yellow-300">
              {t('battleTypes.experimental')}
            </span>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${bg} ${color}`}>
              <Icon size={22} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{t(`battleTypes.types.${key}.label`)}</p>
              <p className="text-xs leading-5 text-greyscale-500 dark:text-greyscale-400">{t(`battleTypes.types.${key}.description`)}</p>
            </div>
            <span className={`inline-block rounded-full border border-current px-2.5 py-0.5 text-xs font-semibold ${color} opacity-80`}>
              {t(`battleTypes.types.${key}.tag`)}
            </span>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
