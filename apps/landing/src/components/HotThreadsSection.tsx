import { Badge, Card } from '@lenserfight/ui/components'
import { useTrendingThreads } from '@lenserfight/features/home'
import { motion } from 'framer-motion'
import { MessageSquare, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const spring = { type: 'spring', stiffness: 280, damping: 22 } as const

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const fadeRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const viewport = { once: true, margin: '-60px' }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function HotThreadsSection() {
  const { t } = useTranslation('home')
  const { data, isLoading } = useTrendingThreads()
  const threads = data?.pages[0]?.data?.slice(0, 3) ?? []

  if (!isLoading && !threads.length) return null

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
      <motion.div className="mb-8 space-y-2" variants={fadeRight} initial="hidden" whileInView="visible" viewport={viewport}>
        <Badge color="purple" variant="outline">{t('threads.badge')}</Badge>
        <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">{t('threads.title')}</h2>
      </motion.div>

      {isLoading ? (
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-surface-raised" />
          ))}
        </div>
      ) : (
        <motion.div
          className="grid gap-5 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {threads.map((thread) => (
            <motion.div
              key={thread.id}
              variants={cardVariant}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
            >
              <Card className="flex h-full flex-col gap-4 p-6 transition-shadow hover:shadow-md dark:hover:shadow-greyscale-900/40">
                <p className="line-clamp-3 flex-1 text-sm leading-7 text-greyscale-700 dark:text-greyscale-300">
                  {thread.title}
                </p>
                <div className="flex items-center gap-3 border-t border-surface-border pt-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-greyscale-500">
                    {thread.author.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-greyscale-900 dark:text-greyscale-0">
                      @{thread.author.handle}
                    </p>
                    <p className="text-xs text-greyscale-500">{timeAgo(thread.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-greyscale-400">
                    <span className="flex items-center gap-1">
                      <Heart size={12} />
                      {thread.reactionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare size={12} />
                      {thread.replyCount}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  )
}
