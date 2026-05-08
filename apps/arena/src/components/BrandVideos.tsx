import { Badge } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Film, Sparkles } from 'lucide-react'
import React, { useRef } from 'react'

const CDN = 'https://cdn.lenserfight.com/brand/gifs'

const BRAND_VIDEOS_DATA = [
  {
    url: `${CDN}/lf-animation-1.gif`,
    title: 'Core Identity',
    description: 'The foundation of the LenserFight visual language. A synthesis of speed and stability.',
    tag: 'Identity',
  },
  {
    url: `${CDN}/lf-animation-2.gif`,
    title: 'Dynamic Flow',
    description: 'Capturing the energy of real-time model battles and high-throughput execution.',
    tag: 'Motion',
  },
  {
    url: `${CDN}/lf-animation-3.gif`,
    title: 'Arena Pulse',
    description: 'The rhythmic heartbeat of the benchmarking engine, visualizing latent space navigation.',
    tag: 'Atmosphere',
  },
  {
    url: `${CDN}/lf-animation-4.gif`,
    title: 'Neural Spark',
    description: 'Visualizing the moment of AI model execution and the birth of a benchmark result.',
    tag: 'Concept',
  },
]

interface BrandVideoProps {
  url: string
  title: string
  description: string
  tag: string
  index: number
}

const BrandVideo: React.FC<BrandVideoProps> = ({ url, title, description, tag, index }) => {
  const containerRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const textY = useTransform(scrollYProgress, [0, 1], ['20px', '-20px'])

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative w-full py-12 lg:py-20"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-greyscale-950 shadow-[0_32px_120px_rgba(0,0,0,0.4)]">
        <div className="relative aspect-[21/9] w-full overflow-hidden sm:aspect-video lg:aspect-[2.4/1]">
          <img
            src={url}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-greyscale-950 via-greyscale-950/40 to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950 via-transparent to-transparent opacity-60" />

          <motion.div
            style={{ y: textY }}
            className="absolute inset-0 flex flex-col justify-center px-8 sm:px-16 lg:px-24"
          >
            <div className="max-w-2xl space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <Badge
                  color="yellow"
                  variant="solid"
                  className="backdrop-blur-xl bg-primary-yellow-500/20 border-primary-yellow-500/30 text-primary-yellow-500 px-4 py-1.5 text-xs font-bold tracking-widest uppercase"
                >
                  {tag}
                </Badge>
              </motion.div>

              <div className="space-y-4">
                <h3 className="text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-6xl">
                  {title}
                </h3>
                <p className="max-w-lg text-lg leading-relaxed text-greyscale-300/90 sm:text-xl">
                  {description}
                </p>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 transition-transform hover:scale-110">
                  <Film className="text-white/80" size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-yellow-500/60">
                    Asset Protocol
                  </span>
                  <span className="text-sm font-medium text-greyscale-400">
                    LFR-VID-{index + 1} // 4K LOG
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="absolute right-12 top-12">
            <Sparkles size={32} className="text-primary-yellow-500/20" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-green" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-greyscale-500">
              Live Render Active
            </span>
          </div>
          <div className="text-[10px] font-mono text-greyscale-600">
            00:00:0{index + 1}:24 // IDENTITY_CORE
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export const BrandVideos: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      {BRAND_VIDEOS_DATA.map((video, i) => (
        <BrandVideo key={video.url} index={i} {...video} />
      ))}
    </div>
  )
}

export default BrandVideos
