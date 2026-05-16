import { StreamState, StreamUsage } from '@lenserfight/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Coins, Copy, LayoutPanelLeft, Loader2, FileCode, PlayCircle } from 'lucide-react'
import React, { useEffect, useRef, useState, useMemo } from 'react'

import { MarkdownRenderer } from './MarkdownRenderer'
import { SegmentedControl } from './SegmentedControl'

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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-greyscale-500 bg-white/50 dark:bg-greyscale-800/50 backdrop-blur-sm border border-greyscale-200 dark:border-greyscale-700 transition-all hover:text-greyscale-900 dark:hover:text-greyscale-100 hover:bg-white dark:hover:bg-greyscale-800 active:scale-95 shadow-sm"
    >
      {copied ? <Check size={14} className="text-status-green" /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * Canonical error envelope rendered by `StreamingOutput`. Callers should pass
 * a structured object (typically the `code` and `message` lifted off a
 * `ProviderError`) so the UI can branch on `code` instead of regex-matching
 * provider strings — that pattern previously produced false positives like
 * showing "Insufficient credits" for an `invalid_funding_source` error that
 * happened to contain the substring "credit".
 */
export type StreamingErrorCode =
  | 'auth_failed'
  | 'permission_denied'
  | 'not_found'
  | 'invalid_request'
  | 'unsupported_model'
  | 'content_policy'
  | 'rate_limited'
  | 'quota_exceeded'
  | 'timeout'
  | 'server_error'
  | 'network_error'
  | 'unknown'

export interface StreamingErrorEnvelope {
  message: string
  code?: StreamingErrorCode
  /** Operator-facing ref shown next to the toast so support can correlate logs. */
  traceId?: string
}

export interface StreamingOutputProps {
  state: StreamState
  output: string
  runId?: string | null
  usage?: StreamUsage | null
  credits?: number | null
  /** Accepts either a structured envelope or a free-form string (legacy). */
  error?: StreamingErrorEnvelope | string | null
}

const FRIENDLY_BY_CODE: Record<StreamingErrorCode, string> = {
  auth_failed: 'Authentication failed. Please sign in again to continue.',
  permission_denied: 'Access denied. Your key may not be authorized for this model.',
  not_found: 'Model not found. Update your model selection.',
  invalid_request: 'The request was malformed.',
  unsupported_model: 'This model is not supported here. Pick a different one.',
  content_policy: 'The provider safety filter blocked this prompt.',
  rate_limited: 'Rate limit reached. Please wait a moment before trying again.',
  quota_exceeded: 'Insufficient credits. Please top up your wallet to continue.',
  timeout: 'The request timed out. Try again shortly.',
  server_error: 'The provider returned an error. Please try again shortly.',
  network_error: 'Network error. Check your connection and try again.',
  unknown: 'An unexpected error occurred. Please try again.',
}

/**
 * Lossless fallback for legacy callers that still pass free-form strings.
 * Each branch is anchored with `\b` to avoid the historical bug of substring
 * matches firing on innocuous text like "platform_credit".
 */
function classifyLegacyError(error: string): StreamingErrorCode {
  if (/\b401\b/.test(error)) return 'auth_failed'
  if (/\b403\b/.test(error)) return 'permission_denied'
  if (/\b402\b|insufficient\s+(credit|fund|balance)|out\s+of\s+credit|no\s+credits?\s+remaining/i.test(error))
    return 'quota_exceeded'
  if (/\b429\b|rate.?limit/i.test(error)) return 'rate_limited'
  if (/\b50[0234]\b/.test(error)) return 'server_error'
  if (/network|fetch|failed to fetch/i.test(error)) return 'network_error'
  if (/timeout|timed out/i.test(error)) return 'timeout'
  return 'unknown'
}

export const StreamingOutput: React.FC<StreamingOutputProps> = ({
  state,
  output,
  runId,
  usage,
  credits,
  error,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview')
  const isCursor = state === 'streaming'
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollContainerRef.current
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

  const copyText = useMemo(() => {
    if (activeTab === 'raw') return output
    // For preview, we try to get innerText from the preview element if available,
    // otherwise fallback to the output string (which is the markdown)
    // but the requirement says "copy user friendly preview".
    // Usually that means cleaned text.
    return previewRef.current?.innerText || output
  }, [output, activeTab])

  return (
    <div className="flex flex-col gap-4 group">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
            <LayoutPanelLeft size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Output</span>
            {runId && (
              <span className="text-[10px] text-gray-400 font-mono opacity-60">RUN_{runId.slice(0, 8).toUpperCase()}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {state === 'complete' && usage && credits !== null && credits !== undefined && (
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Coins size={12} className="text-amber-500" />
                <span>{credits} cr</span>
              </div>
              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
              <span>{usage.input_tokens + usage.output_tokens} tokens</span>
            </div>
          )}

          <SegmentedControl
            size="sm"
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'preview' | 'raw')}
            options={[
              { value: 'preview', label: <div className="flex items-center gap-1.5"><PlayCircle size={14} /> Preview</div> },
              { value: 'raw', label: <div className="flex items-center gap-1.5"><FileCode size={14} /> Raw</div> },
            ]}
            className="bg-gray-100/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {error ? (() => {
        const envelope: StreamingErrorEnvelope =
          typeof error === 'string'
            ? { message: error, code: classifyLegacyError(error) }
            : error
        const code = envelope.code ?? 'unknown'
        const friendly = FRIENDLY_BY_CODE[code]
        // Prefer the provider's own message when it's actionable; otherwise
        // fall back to the localized friendly string.
        const body = envelope.message && envelope.message !== friendly ? envelope.message : friendly
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                  <Loader2 size={16} className="rotate-45" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300">Execution failed</p>
                  <p className="text-sm text-red-700/80 dark:text-red-400/80 leading-relaxed mt-1">{body}</p>
                  {envelope.traceId && (
                    <p className="mt-2 text-[10px] font-mono text-red-500/70 dark:text-red-400/60">
                      ref: {envelope.traceId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )
      })() : (
        <div className="relative group/content">
          <AnimatePresence mode="wait">
            {state === 'complete' && output && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div className="absolute top-4 right-4 z-20">
                  <CopyButton text={copyText} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            ref={scrollContainerRef}
            className="w-full bg-gray-50/50 dark:bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-800 overflow-y-auto overscroll-contain max-h-[65vh] min-h-[120px] shadow-sm transition-all hover:shadow-md"
          >
            <div className="p-6">
              <AnimatePresence mode="wait">
                {activeTab === 'preview' ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    ref={previewRef}
                  >
                    <MarkdownRenderer content={output} />
                    {isCursor && (
                      <span className="inline-block w-2 h-4 ml-1 bg-primary-500 animate-pulse align-middle" />
                    )}
                  </motion.div>
                ) : (
                  <motion.pre
                    key="raw"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="whitespace-pre-wrap break-words text-sm font-mono text-gray-700 dark:text-gray-300 leading-relaxed">
                      {output}
                      {isCursor && <span className="animate-pulse">▌</span>}
                    </div>
                  </motion.pre>
                )}
              </AnimatePresence>
              <div ref={bottomRef} className="h-px" />
            </div>
          </div>

          {state === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-[2px] rounded-2xl z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-primary-500" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Connecting…</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
