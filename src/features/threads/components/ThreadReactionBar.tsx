import { ArrowUp } from 'lucide-react'
import React, { useEffect, useState, useRef } from 'react'

interface ThreadReactionBarProps {
  count: number
  hasReacted: boolean
  onReact: () => void
  isLoading?: boolean
}

const RollingNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(value)

  // Use a ref to track if it's the initial mount to skip animation on load
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      setDisplay(value) // Sync just in case
      return
    }

    let startTimestamp: number | null = null
    const startValue = display
    const endValue = value
    const duration = 400 // ms

    if (startValue === endValue) return

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)

      // Ease Out Cubic
      const ease = 1 - Math.pow(1 - progress, 3)

      const current = Math.round(startValue + (endValue - startValue) * ease)
      setDisplay(current)

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [value])

  return <span>{display}</span>
}

export const ThreadReactionBar: React.FC<ThreadReactionBarProps> = ({
  count,
  hasReacted,
  onReact,
  isLoading,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onReact}
        disabled={isLoading}
        className={`
           flex items-center space-x-1.5 px-4 py-1.5 rounded-full border transition-all duration-300 group active:scale-95
           ${
             hasReacted
               ? 'bg-primary border-primary text-gray-900 shadow-sm ring-2 ring-primary/20'
               : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
           }
           disabled:opacity-70 disabled:cursor-not-allowed
         `}
      >
        <ArrowUp
          className={`w-4 h-4 transition-transform duration-300 ${hasReacted ? 'stroke-[3px] scale-110' : 'group-hover:-translate-y-0.5'}`}
        />
        <span className="text-sm font-bold min-w-[1ch] text-center tabular-nums">
          <RollingNumber value={count} />
        </span>
      </button>
      <span className="text-sm text-gray-500 font-medium ml-2 select-none">Upvote</span>
    </div>
  )
}
