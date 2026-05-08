import { Badge } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Film, Sparkles } from 'lucide-react'
import React, { useRef } from 'react'

interface BrandVideoProps {
  url: string
  title: string
  description: string
  tag: string
  index: number
}

/**
 * A premium, full-width brand video component with parallax effects
 * and high-end cinematic framing.
 */
const BrandVideo: React.FC<BrandVideoProps> = ({ url, title, description, tag, index }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const videoY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%'])
  const textY = useTransform(scrollYProgress, [0, 1], ['20px', '-20px'])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  return (
    <motion.div
      ref={containerRef}
      style={{ opacity }}
      className="relative w-full py-12 lg:py-20"
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-greyscale-950 shadow-[0_32px_120px_rgba(0,0,0,0.4)]">
        {/* Parallax Video Container */}
        <div className="relative aspect-[21/9] w-full overflow-hidden sm:aspect-video lg:aspect-[2.4/1]">
          <motion.video
            style={{ y: videoY, scale: 1.1 }}
            src={url}
            autoPlay
            loop
            muted
            playsInline
            className="h-[120%] w-full object-cover"
          />
          
          {/* Cinematic Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-greyscale-950 via-greyscale-950/40 to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950 via-transparent to-transparent opacity-60" />
          
          {/* Content Overlay */}
          <motion.div 
            style={{ y: textY }}
            className="absolute inset-0 flex flex-col justify-center px-8 sm:px-16 lg:px-24"
          >
            <div className="max-w-2xl space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge color="yellow" variant="solid" className="backdrop-blur-xl bg-primary-yellow-500/20 border-primary-yellow-500/30 text-primary-yellow-500 px-4 py-1.5 text-xs font-bold tracking-widest uppercase">
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
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-yellow-500/60">Asset Protocol</span>
                  <span className="text-sm font-medium text-greyscale-400">LFR-VID-{index + 1} // 4K LOG</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Corner Sparkle */}
          <div className="absolute right-12 top-12">
            <Sparkles size={32} className="text-primary-yellow-500/20" />
          </div>
        </div>

        {/* Bottom Status Bar */}
        <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-8 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-green" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-greyscale-500">Live Render Active</span>
          </div>
          <div className="text-[10px] font-mono text-greyscale-600">
            00:00:0{index + 1}:24 // IDENTITY_CORE
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const BRAND_VIDEOS_DATA = [
  {
    url: 'https://cdn.lenserfight.com/brand/videos/lf-animation-1.mp4',
    title: 'Core Identity',
    description: 'The foundation of the LenserFight visual language. A synthesis of speed and stability.',
    tag: 'Identity',
  },
  {
    url: 'https://cdn.lenserfight.com/brand/videos/lf-animation-2.mp4',
    title: 'Dynamic Flow',
    description: 'Capturing the energy of real-time model battles and high-throughput execution.',
    tag: 'Motion',
  },
  {
    url: 'https://cdn.lenserfight.com/brand/videos/lf-animation-3.mp4',
    title: 'Arena Pulse',
    description: 'The rhythmic heartbeat of the benchmarking engine, visualizing latent space navigation.',
    tag: 'Atmosphere',
  },
  {
    url: 'https://cdn.lenserfight.com/brand/videos/lf-animation-4.mp4',
    title: 'Neural Spark',
    description: 'Visualizing the moment of AI model execution and the birth of a benchmark result.',
    tag: 'Concept',
  },
]

export const BrandVideos: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      {BRAND_VIDEOS_DATA.map((video, i) => (
        <BrandVideo
          key={video.url}
          index={i}
          {...video}
        />
      ))}
    </div>
  )
}

export default BrandVideos
