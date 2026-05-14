import { Badge, Button } from '@lenserfight/ui/components'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Film, Sparkles, Youtube } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const DUKKAN_VIDEO = {
  url: '/brand/dukkan.gif',
  title: 'This is my Dukkan!',
  description: 'My dream started with a YouTube video.',
  tag: 'Founder note',
  youtubeUrl: 'https://www.youtube.com/@ofcskn',
}

export const FounderDukkanVideo: React.FC = () => {
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
    <div ref={targetRef} className="relative ml-[calc(50%_-_50vw)] h-[250vh] w-screen">
      <div
        ref={viewportRef}
        className="sticky top-0 z-20 flex h-[100dvh] w-screen items-center overflow-hidden bg-greyscale-950"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-primary-yellow-500/5 blur-[120px]" />
          <div className="absolute -right-[10%] -bottom-[20%] h-[50%] w-[50%] rounded-full bg-primary-yellow-500/5 blur-[120px]" />
        </div>

        <motion.div style={{ opacity }} className="absolute left-8 top-12 z-10 sm:left-16 lg:left-24">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary-yellow-500/60">
            <Film size={14} />
            <span>Note from Omer</span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter text-white sm:text-4xl">
            The first spark
          </h2>
        </motion.div>

        <motion.div
          ref={trackRef}
          style={{ x }}
          className="flex gap-5 px-5 sm:gap-8 sm:px-10 lg:gap-12 lg:px-24"
        >
          <div className="group relative flex h-[62vh] w-[82vw] shrink-0 items-end overflow-hidden rounded-[1.75rem] bg-greyscale-900 shadow-2xl transition-all duration-500 hover:ring-1 hover:ring-primary-yellow-500/20 sm:h-[65vh] sm:rounded-[2rem] lg:h-[70vh] lg:w-[min(75vw,72rem)] lg:rounded-[2.5rem]">
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={DUKKAN_VIDEO.url}
                alt={DUKKAN_VIDEO.title}
                className="h-full w-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-110"
                loading="lazy"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950 via-greyscale-950/40 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-greyscale-950/70 via-greyscale-950/10 to-transparent opacity-70" />

            <div className="relative z-10 w-full p-8 sm:p-12 lg:p-16">
              <div className="max-w-2xl space-y-6">
                <Badge
                  color="yellow"
                  variant="solid"
                  className="border-primary-yellow-500/30 bg-primary-yellow-500/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-primary-yellow-500 backdrop-blur-xl"
                >
                  {DUKKAN_VIDEO.tag}
                </Badge>

                <div className="space-y-4">
                  <h3 className="text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-7xl">
                    {DUKKAN_VIDEO.title}
                  </h3>
                  <p className="max-w-lg text-lg leading-relaxed text-greyscale-300/80 sm:text-xl">
                    {DUKKAN_VIDEO.description}
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => window.open(DUKKAN_VIDEO.youtubeUrl, '_blank', 'noopener,noreferrer')}
                  className="rounded-full font-black shadow-[0_0_24px_rgba(234,179,8,0.25)] hover:shadow-[0_0_32px_rgba(234,179,8,0.34)]"
                >
                  <Youtube size={17} />
                  YouTube
                </Button>
              </div>
            </div>

            <div className="absolute right-12 top-12 hidden items-center gap-6 sm:flex">
              <div className="flex flex-col items-end">
                <span className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary-yellow-500/40">
                  Chapter
                </span>
                <span className="font-mono text-3xl font-black italic leading-none text-primary-yellow-500">
                  01
                </span>
              </div>
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-primary-yellow-500/30 to-transparent" />
            </div>
          </div>
        </motion.div>

        <div className="absolute bottom-12 left-8 right-8 h-px bg-greyscale-800 sm:left-16 sm:right-16 lg:left-24 lg:right-24">
          <motion.div
            className="h-full origin-left bg-primary-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
            style={{ scaleX: scrollYProgress }}
          />
          <div className="absolute left-0 top-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-greyscale-500">
            <Sparkles size={12} className="text-primary-yellow-500" />
            <span>Scroll to enter the Dukkan</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FounderDukkanVideo
