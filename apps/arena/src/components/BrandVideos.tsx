import { Badge } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Film, Sparkles } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

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

export const BrandVideos: React.FC = () => {
  const targetRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [travelDistance, setTravelDistance] = useState(0)

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  })

  useEffect(() => {
    const updateTravelDistance = () => {
      const viewport = viewportRef.current
      const track = trackRef.current

      if (!viewport || !track) {
        return
      }

      setTravelDistance(Math.max(0, track.scrollWidth - viewport.clientWidth))
    }

    updateTravelDistance()

    const resizeObserver = new ResizeObserver(updateTravelDistance)
    if (viewportRef.current) resizeObserver.observe(viewportRef.current)
    if (trackRef.current) resizeObserver.observe(trackRef.current)

    window.addEventListener('resize', updateTravelDistance)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateTravelDistance)
    }
  }, [])

  const baseX = useTransform(scrollYProgress, [0, 1], [0, -travelDistance])
  const x = useSpring(baseX, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })
  const opacity = useTransform(scrollYProgress, [0, 0.05, 0.95, 1], [0, 1, 1, 0])

  return (
    <div ref={targetRef} className="relative ml-[calc(50%_-_50vw)] h-[450vh] w-screen">
      <div ref={viewportRef} className="sticky top-0 z-20 flex h-[100dvh] w-screen items-center overflow-hidden bg-greyscale-950">
        {/* Background decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-primary-yellow-500/5 blur-[120px]" />
          <div className="absolute -right-[10%] -bottom-[20%] h-[50%] w-[50%] rounded-full bg-primary-yellow-500/5 blur-[120px]" />
        </div>

        <motion.div style={{ opacity }} className="absolute left-8 top-12 z-10 sm:left-16 lg:left-24">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary-yellow-500/60">
            <Film size={14} />
            <span>Brand Experience</span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
            Visual Narrative
          </h2>
        </motion.div>

        <motion.div ref={trackRef} style={{ x }} className="flex gap-5 px-5 sm:gap-8 sm:px-10 lg:gap-12 lg:px-24">
          {BRAND_VIDEOS_DATA.map((video, i) => (
            <div
              key={video.url}
              className="group relative flex h-[62vh] w-[82vw] shrink-0 items-end overflow-hidden rounded-[1.75rem] bg-greyscale-900 shadow-2xl transition-all duration-500 hover:ring-1 hover:ring-primary-yellow-500/20 sm:h-[65vh] sm:rounded-[2rem] lg:h-[70vh] lg:w-[min(75vw,72rem)] lg:rounded-[2.5rem]"
            >
              {/* Image Container */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={video.url}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950 via-greyscale-950/40 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-r from-greyscale-950/60 via-transparent to-transparent opacity-40" />

              {/* Content */}
              <div className="relative z-10 w-full p-8 sm:p-12 lg:p-16">
                <div className="max-w-2xl space-y-6">
                  <Badge
                    color="yellow"
                    variant="solid"
                    className="bg-primary-yellow-500/20 border-primary-yellow-500/30 text-primary-yellow-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl"
                  >
                    {video.tag}
                  </Badge>

                  <div className="space-y-4">
                    <h3 className="text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-7xl">
                      {video.title}
                    </h3>
                    <p className="max-w-lg text-lg leading-relaxed text-greyscale-300/80 sm:text-xl">
                      {video.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Counter and Decorative Line */}
              <div className="absolute right-12 top-12 flex items-center gap-6">
                <div className="flex flex-col items-end">
                  <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary-yellow-500/40">
                    Chapter
                  </span>
                  <span className="font-mono text-3xl font-black italic leading-none text-primary-yellow-500">
                    0{i + 1}
                  </span>
                </div>
                <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary-yellow-500/30 to-transparent" />
              </div>
            </div>
          ))}

          {/* Last slide placeholder */}
          <div className="flex h-[62vh] w-[24vw] shrink-0 items-center justify-center opacity-20 sm:h-[65vh] lg:h-[70vh] lg:w-[20vw]">
            <div className="flex flex-col items-center gap-4">
              <div className="h-px w-24 bg-primary-yellow-500" />
              <span className="text-xs font-black uppercase tracking-[0.5em] text-primary-yellow-500">
                End
              </span>
            </div>
          </div>
        </motion.div>

        {/* Scroll Progress Bar */}
        <div className="absolute bottom-12 left-8 right-8 h-px bg-greyscale-800 sm:left-16 sm:right-16 lg:left-24 lg:right-24">
          <motion.div
            className="h-full origin-left bg-primary-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
            style={{ scaleX: scrollYProgress }}
          />
          <div className="absolute left-0 top-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-greyscale-500">
            <Sparkles size={12} className="text-primary-yellow-500" />
            <span>Scroll to Explore Narrative</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BrandVideos
