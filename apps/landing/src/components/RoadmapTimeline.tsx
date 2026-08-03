import { Badge, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Clock, Sparkles } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const PHASE_INDICES = [0, 1, 2] as const

const STATUS_STYLE: Record<string, { color: 'green' | 'yellow'; icon: React.ElementType }> = {
  in_progress: { color: 'yellow', icon: Clock },
  planned: { color: 'green', icon: Sparkles },
}

export interface RoadmapTimelineProps {
  readonly headingLevel?: 'h2' | 'h3'
  readonly className?: string
}

export const RoadmapTimeline: React.FC<RoadmapTimelineProps> = ({
  headingLevel: Heading = 'h2',
  className,
}) => {
  const { t } = useTranslation(['roadmap'])

  return (
    <div className={className}>
      <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
        <Badge color="yellow" variant="outline">{t('roadmap:timeline.badge')}</Badge>
        <Heading className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
          {t('roadmap:timeline.title')}
        </Heading>
      </motion.div>
      <motion.div className="space-y-5" variants={stagger} initial="hidden" whileInView="visible" viewport={viewport}>
        {PHASE_INDICES.map((i) => {
          const status = t(`roadmap:timeline.phases.${i}.status`)
          const { color, icon: StatusIcon } = STATUS_STYLE[status] ?? STATUS_STYLE.planned
          return (
            <motion.div key={i} variants={fadeUp}>
              <Card className="grid gap-4 p-6 sm:grid-cols-[auto_1fr] sm:items-start">
                <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                  <Badge color={color} variant="outline">
                    <StatusIcon size={12} className="mr-1 inline" />
                    {t(`roadmap:timeline.statusLabels.${status}`)}
                  </Badge>
                  <span className="font-mono text-xs font-black uppercase tracking-widest text-greyscale-500">
                    {t(`roadmap:timeline.phases.${i}.period`)}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                    {t(`roadmap:timeline.phases.${i}.title`)}
                  </h3>
                  <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                    {t(`roadmap:timeline.phases.${i}.description`)}
                  </p>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

export default RoadmapTimeline
