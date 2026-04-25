import { StreamState, StreamUsage } from '@lenserfight/types'
import { Check, Coins, Copy, LayoutPanelLeft, Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-greyscale-500 transition-colors hover:text-greyscale-700 dark:hover:text-greyscale-300"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export interface StreamingOutputProps {
  state: StreamState
  output: string
  runId?: string | null
  usage?: StreamUsage | null
  credits?: number | null
  error?: string | null
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  state,
  output,
  runId,
  usage,
  credits,
  error,
}) => {
  const isCursor = state === 'streaming'
  const bottomRef = useRef<HTMLDivElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const userScrolledUpRef = useRef(false)

  useEffect(() => {
    const el = preRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
      userScrolledUpRef.current = !atBottom
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!isCursor || userScrolledUpRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [output, isCursor])

  useEffect(() => {
    if (state === 'complete') {
      userScrolledUpRef.current = false
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [state])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutPanelLeft size={16} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Output</span>
          {runId && (
            <span className="text-xs text-gray-400 font-mono truncate">{runId.slice(0, 8)}</span>
          )}
        </div>
        {state === 'complete' && usage && credits !== null && credits !== undefined && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            <Coins size={12} />
            <span>{credits} cr</span>
            <span>·</span>
            <span>{usage.input_tokens + usage.output_tokens} tokens</span>
          </div>
        )}
        {state === 'loading' && (
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
            <Loader2 size={12} className="animate-spin" />
            Connecting…
          </span>
        )}
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Execution failed</p>
          <p className="text-sm text-red-600 dark:text-red-300">
            {/401/.test(error)
              ? 'Authentication failed. Please sign in again to continue.'
              : /403/.test(error)
                ? 'Access denied. You do not have permission to use this model.'
                : /402|insufficient|credit/i.test(error)
                  ? 'Insufficient credits. Please top up your wallet to continue.'
                  : /429|rate.?limit/i.test(error)
                    ? 'Rate limit reached. Please wait a moment before trying again.'
                    : /500|502|503|504/.test(error)
                      ? 'The server encountered an error. Please try again shortly.'
                      : /network|fetch|failed to fetch/i.test(error)
                        ? 'Network error. Check your connection and try again.'
                        : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {state === 'complete' && output && (
            <div className="absolute top-2 right-2 z-10">
              <CopyButton text={output} />
            </div>
          )}
          <pre
            ref={preRef}
            className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 pr-16 border border-gray-200 dark:border-gray-700 font-mono leading-relaxed min-h-[3rem] max-h-[60vh] overflow-y-auto overscroll-contain"
          >
            {output}
            {isCursor && <span className="animate-pulse">▌</span>}
            <span ref={bottomRef} />
          </pre>
        </div>
      )}
    </div>
  )
}
