import React, { useEffect, useState, useRef } from 'react'

import { SEOHead } from '../../../components/SEOHead'
import { useTheme } from '../../../context/ThemeContext'
import { tagService } from '../../../services/tagService'
import { TagUsage } from '../../../types/tags.types'
import { TagCloud } from '../components/TagCloud'

const NodeGraphBackground: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight)

    const particles: { x: number; y: number; vx: number; vy: number }[] = []
    const particleCount = Math.min(Math.floor((width * height) / 20000), 40)
    const connectionDistance = Math.min(width, height) * 0.15 + 30

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      // Adjust color based on theme
      const color = theme === 'dark' ? '#374151' : '#E5E7EB' // gray-700 vs gray-200

      ctx.fillStyle = color
      ctx.strokeStyle = color

      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < connectionDistance) {
            ctx.beginPath()
            ctx.globalAlpha = 0.3 * (1 - dist / connectionDistance)
            ctx.lineWidth = 1
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
            ctx.globalAlpha = 1.0
          }
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    const handleResize = () => {
      if (!canvas.parentElement) return
      width = canvas.width = canvas.parentElement.clientWidth
      height = canvas.height = canvas.parentElement.clientHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [theme]) // Re-run effect when theme changes to update colors

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-50"
    />
  )
}

export const TagCloudPage: React.FC = () => {
  const [tags, setTags] = useState<TagUsage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { theme } = useTheme()

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await tagService.getCloud()
        setTags(data)
      } catch (e) {
        console.error('Failed to load tag cloud', e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchTags()
  }, [])

  return (
    <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-center overflow-hidden bg-gray-50/30 dark:bg-gray-900 transition-colors duration-200">
      <SEOHead type="tag-cloud" />
      <NodeGraphBackground theme={theme} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-12 flex flex-col items-center">
        {isLoading ? (
          <div className="flex gap-3 opacity-30 items-center justify-center h-64">
            <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-4 h-4 bg-gray-400 rounded-full animate-bounce delay-150"></div>
          </div>
        ) : tags.length > 0 ? (
          <div className="w-full animate-in fade-in zoom-in duration-700 ease-out">
            <TagCloud tags={tags} />
          </div>
        ) : (
          <div className="text-gray-300 dark:text-gray-600 font-light text-sm tracking-widest uppercase mt-20">
            No topics found
          </div>
        )}
      </div>
    </div>
  )
}
