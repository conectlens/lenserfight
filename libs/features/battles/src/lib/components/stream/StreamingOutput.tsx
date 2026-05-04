/**
 * StreamingOutput — progressive text display with auto-scroll and blinking cursor.
 *
 * Renders streaming text content. Used for both live execution and replay.
 * The component is source-agnostic — it doesn't know whether tokens come
 * from a live stream or replay controller (Indirection principle).
 */
import React, { useEffect, useRef } from 'react'

interface StreamingOutputProps {
  content: string
  isStreaming: boolean
  className?: string
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  content,
  isStreaming,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (!isStreaming || !shouldAutoScroll.current || !containerRef.current) return
    containerRef.current.scrollTop = containerRef.current.scrollHeight
  }, [content, isStreaming])

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 40
  }

  // Reset auto-scroll when streaming starts
  useEffect(() => {
    if (isStreaming) shouldAutoScroll.current = true
  }, [isStreaming])

  if (!content && !isStreaming) {
    return (
      <div className={`flex items-center justify-center min-h-[120px] text-greyscale-400 text-sm ${className}`}>
        Awaiting execution…
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-y-auto max-h-[400px] scroll-smooth ${className}`}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-greyscale-900 dark:text-greyscale-50">
        {content}
        {isStreaming && (
          <span className="inline-block w-[2px] h-[1em] bg-greyscale-900 dark:bg-greyscale-50 animate-pulse align-text-bottom ml-0.5" />
        )}
      </div>
    </div>
  )
}
