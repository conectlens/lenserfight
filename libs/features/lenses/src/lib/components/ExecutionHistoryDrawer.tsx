
import { queryKeys } from '@lenserfight/data/cache'
import { executionService, mediaRepository } from '@lenserfight/data/repositories'
import { Badge, DownloadButton } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { Drawer } from '@lenserfight/ui/overlays'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock,
  Coins,
  Copy,
  Check,
  Lock,
  Timer,
  Hash,
  FileText,
  ImageIcon,
  Music,
  Maximize2,
} from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { LensExecutionHistoryItem, ExecutionArtifact } from '@lenserfight/types'

const HISTORY_PAGE_SIZE = 20

// ─── Utilities ────────────────────────────────────────────────────────────────

function extensionFromKind(kind: string): string {
  switch (kind) {
    case 'image': return 'png'
    case 'video': return 'mp4'
    case 'audio': return 'mp3'
    default: return 'bin'
  }
}

function formatLatency(ms: number | null | undefined): string {
  if (!ms) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  })
}

interface DateGroup {
  label: string
  items: LensExecutionHistoryItem[]
}

function groupByDate(items: LensExecutionHistoryItem[]): DateGroup[] {
  const groups: DateGroup[] = []
  const seen = new Map<string, LensExecutionHistoryItem[]>()
  for (const item of items) {
    const label = getDateLabel(item.createdAt)
    if (!seen.has(label)) {
      const group: LensExecutionHistoryItem[] = []
      seen.set(label, group)
      groups.push({ label, items: group })
    }
    seen.get(label)!.push(item)
  }
  return groups
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  succeeded: 'green',
  failed: 'red',
  running: 'yellow',
  queued: 'gray',
  canceled: 'gray',
  timed_out: 'red',
}

function RunStatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'unknown'
  return (
    <Badge color={STATUS_COLORS[s] ?? 'gray'} variant="outline">
      {s}
    </Badge>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-surface-border bg-surface-base p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 rounded-full bg-surface-raised" />
        <div className="h-4 w-20 rounded bg-surface-raised" />
        <div className="h-4 w-32 rounded bg-surface-raised" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-3 w-24 rounded bg-surface-raised" />
        <div className="h-3 w-12 rounded bg-surface-raised" />
        <div className="h-3 w-16 rounded bg-surface-raised" />
        <div className="h-3 w-10 rounded bg-surface-raised" />
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handle}
      className="flex items-center gap-1 text-xs text-greyscale-500 transition-colors hover:text-greyscale-700 dark:hover:text-greyscale-300"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── Artifact preview modal ───────────────────────────────────────────────────

function ArtifactPreviewModal({
  artifact,
  isOpen,
  onClose,
}: {
  artifact: ExecutionArtifact | null
  isOpen: boolean
  onClose: () => void
}) {
  const { data: signedUrl, isLoading: isLoadingUrl } = useQuery({
    queryKey: ['media-signed-url', artifact?.mediaObjectId],
    queryFn: () => mediaRepository.getSignedReadUrl(artifact!.mediaObjectId!),
    enabled: isOpen && !!artifact?.mediaObjectId,
    staleTime: 50 * 60_000,
  })

  if (!artifact) return null

  const isMedia = ['image', 'video', 'audio'].includes(artifact.artifactKind)
  const filename = artifact.mediaObjectId
    ? (artifact.mediaObjectId.split('/').pop() ?? `output.${extensionFromKind(artifact.artifactKind)}`)
    : `output.${extensionFromKind(artifact.artifactKind)}`

  const textContent =
    artifact.contentText ??
    (artifact.contentJson != null ? JSON.stringify(artifact.contentJson, null, 2) : null)

  const title = isMedia
    ? `${artifact.artifactKind.charAt(0).toUpperCase()}${artifact.artifactKind.slice(1)} Preview`
    : 'Full Output'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      fullWidth
      footer={
        isMedia && signedUrl ? (
          <div className="flex justify-end">
            <DownloadButton url={signedUrl} filename={filename} />
          </div>
        ) : textContent ? (
          <div className="flex justify-end gap-2">
            <DownloadButton
              content={textContent}
              filename={`output-${artifact.id}.txt`}
              mimeType="text/plain; charset=utf-8"
            />
            <CopyButton text={textContent} />
          </div>
        ) : null
      }
    >
      {isMedia ? (
        isLoadingUrl ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-greyscale-400" />
          </div>
        ) : !signedUrl ? (
          <p className="py-8 text-center text-sm text-greyscale-400">Media unavailable.</p>
        ) : artifact.artifactKind === 'image' ? (
          <img src={signedUrl} alt="Preview" className="h-auto w-full rounded-lg" />
        ) : artifact.artifactKind === 'video' ? (
          <video src={signedUrl} controls className="h-auto w-full rounded-lg" />
        ) : (
          <div className="p-4">
            <audio src={signedUrl} controls className="w-full" />
          </div>
        )
      ) : textContent ? (
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-greyscale-700 dark:text-greyscale-200">
          {textContent}
        </pre>
      ) : (
        <p className="py-8 text-center text-sm text-greyscale-400">No content.</p>
      )}
    </Modal>
  )
}

// ─── Media thumbnail item ─────────────────────────────────────────────────────

function MediaArtifactItem({
  artifact,
  onPreview,
}: {
  artifact: ExecutionArtifact
  onPreview: (a: ExecutionArtifact) => void
}) {
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ['media-signed-url', artifact.mediaObjectId],
    queryFn: () => mediaRepository.getSignedReadUrl(artifact.mediaObjectId!),
    enabled: !!artifact.mediaObjectId,
    staleTime: 50 * 60_000,
  })

  const filename = artifact.mediaObjectId
    ? (artifact.mediaObjectId.split('/').pop() ?? `output.${extensionFromKind(artifact.artifactKind)}`)
    : `output.${extensionFromKind(artifact.artifactKind)}`

  if (isLoading) {
    return <div className="aspect-square animate-pulse rounded-xl bg-surface-raised" />
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
      {artifact.artifactKind === 'image' && signedUrl && (
        <img src={signedUrl} alt="Generated" className="aspect-square w-full object-cover" />
      )}
      {artifact.artifactKind === 'video' && signedUrl && (
        <video src={signedUrl} className="aspect-square w-full object-cover" muted />
      )}
      <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
        <button
          type="button"
          onClick={() => onPreview(artifact)}
          className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-greyscale-800 hover:bg-white"
        >
          <Maximize2 size={11} />
          Preview
        </button>
        {signedUrl && <DownloadButton url={signedUrl} filename={filename} />}
      </div>
    </div>
  )
}

// ─── Audio artifact item ──────────────────────────────────────────────────────

function AudioArtifactItem({ artifact }: { artifact: ExecutionArtifact }) {
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ['media-signed-url', artifact.mediaObjectId],
    queryFn: () => mediaRepository.getSignedReadUrl(artifact.mediaObjectId!),
    enabled: !!artifact.mediaObjectId,
    staleTime: 50 * 60_000,
  })

  const filename = artifact.mediaObjectId
    ? (artifact.mediaObjectId.split('/').pop() ?? 'output.mp3')
    : 'output.mp3'

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-raised p-3">
      {isLoading ? (
        <div className="h-10 animate-pulse rounded bg-surface-raised" />
      ) : signedUrl ? (
        <audio src={signedUrl} controls className="h-10 w-full" />
      ) : (
        <p className="text-xs text-greyscale-400">Audio unavailable.</p>
      )}
      {signedUrl && (
        <div className="flex justify-end">
          <DownloadButton url={signedUrl} filename={filename} />
        </div>
      )}
    </div>
  )
}

// ─── Run artifacts grouped by type ───────────────────────────────────────────

function RunArtifactsByType({
  runId,
  onPreview,
}: {
  runId: string
  onPreview: (a: ExecutionArtifact) => void
}) {
  const { data: artifacts = [], isLoading } = useQuery<ExecutionArtifact[]>({
    queryKey: queryKeys.executions.artifacts(runId),
    queryFn: () => executionService.getArtifacts(runId),
    enabled: !!runId,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2 pt-2">
        <div className="h-3 w-16 rounded bg-surface-raised" />
        <div className="h-20 rounded-xl bg-surface-raised" />
      </div>
    )
  }

  if (artifacts.length === 0) {
    return <p className="pt-2 text-xs italic text-greyscale-400">No artifacts found.</p>
  }

  const textArtifacts = artifacts.filter((a) => a.artifactKind === 'text' && a.contentText)
  const jsonArtifacts = artifacts.filter((a) => a.artifactKind === 'json' && a.contentJson != null)
  const mediaArtifacts = artifacts.filter(
    (a) => ['image', 'video'].includes(a.artifactKind) && a.mediaObjectId,
  )
  const audioArtifacts = artifacts.filter((a) => a.artifactKind === 'audio' && a.mediaObjectId)

  return (
    <div className="space-y-4 pt-2">
      {/* Text */}
      {textArtifacts.map((a) => {
        const preview =
          a.contentText!.length > 400 ? `${a.contentText!.slice(0, 400)}…` : a.contentText!
        return (
          <div key={a.id} className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-greyscale-400">
              <FileText size={10} />
              Text
            </div>
            <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
              <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-greyscale-700 dark:text-greyscale-300">
                {preview}
              </pre>
              <div className="flex items-center justify-between border-t border-surface-border px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => onPreview(a)}
                  className="text-[11px] font-medium text-primary-yellow-600 transition-colors hover:text-primary-yellow-700"
                >
                  {a.contentText!.length > 400 ? 'View full →' : 'Open in viewer →'}
                </button>
                <div className="flex items-center gap-2">
                  <DownloadButton
                    content={a.contentText!}
                    filename={`output-${a.id}.txt`}
                    mimeType="text/plain; charset=utf-8"
                  />
                  <CopyButton text={a.contentText!} />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* JSON */}
      {jsonArtifacts.map((a) => {
        const pretty = JSON.stringify(a.contentJson, null, 2)
        const preview = pretty.length > 400 ? `${pretty.slice(0, 400)}…` : pretty
        return (
          <div key={a.id} className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-greyscale-400">
              <FileText size={10} />
              JSON
            </div>
            <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-raised">
              <pre className="whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed text-greyscale-700 dark:text-greyscale-300">
                {preview}
              </pre>
              <div className="flex items-center justify-between border-t border-surface-border px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => onPreview(a)}
                  className="text-[11px] font-medium text-primary-yellow-600 transition-colors hover:text-primary-yellow-700"
                >
                  {pretty.length > 400 ? 'View full →' : 'Open in viewer →'}
                </button>
                <div className="flex items-center gap-2">
                  <DownloadButton
                    content={pretty}
                    filename={`output-${a.id}.json`}
                    mimeType="application/json"
                  />
                  <CopyButton text={pretty} />
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Images & Video */}
      {mediaArtifacts.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-greyscale-400">
            <ImageIcon size={10} />
            Images &amp; Video
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mediaArtifacts.map((a) => (
              <MediaArtifactItem key={a.id} artifact={a} onPreview={onPreview} />
            ))}
          </div>
        </div>
      )}

      {/* Audio */}
      {audioArtifacts.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-greyscale-400">
            <Music size={10} />
            Audio
          </div>
          <div className="space-y-2">
            {audioArtifacts.map((a) => (
              <AudioArtifactItem key={a.id} artifact={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'succeeded' | 'failed'

function FilterBar({
  status,
  onStatusChange,
}: {
  status: StatusFilter
  onStatusChange: (s: StatusFilter) => void
}) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'succeeded', label: 'Succeeded' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onStatusChange(opt.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            status === opt.value
              ? 'bg-primary-yellow-500/15 text-primary-yellow-600'
              : 'bg-surface-base text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-700 dark:hover:text-greyscale-300'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ExecutionHistoryDrawerProps {
  open: boolean
  onClose: () => void
  lensId: string
  onSelectRun: (runId: string) => void
  isLocked?: boolean
  lockReason?: 'unauthenticated' | 'no_profile'
  onSignIn?: () => void
}

export function ExecutionHistoryDrawer({
  open,
  onClose,
  lensId,
  onSelectRun,
  isLocked = false,
  lockReason = 'unauthenticated',
  onSignIn,
}: ExecutionHistoryDrawerProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [previewArtifact, setPreviewArtifact] = useState<ExecutionArtifact | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // ── Self-contained fetch ────────────────────────────────────────────────────
  // The drawer owns its execution-history fetch. It fires the moment the drawer
  // opens (gated on `open`) — never depends on a parent passing data in. Uses the
  // shared `queryKeys.executions.history(lensId)` key so a freshly completed run
  // (which invalidates that key) refreshes an open drawer automatically.
  const {
    data: infiniteData,
    isLoading: isLoadingHistory,
    isFetchingNextPage: isFetchingMore,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.executions.history(lensId),
    queryFn: ({ pageParam }) =>
      executionService.getHistoryForLens(lensId, HISTORY_PAGE_SIZE, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage: LensExecutionHistoryItem[], allPages) =>
      lastPage.length >= HISTORY_PAGE_SIZE ? allPages.length * HISTORY_PAGE_SIZE : undefined,
    enabled: open && !isLocked && !!lensId,
    staleTime: 60_000,
  })

  const history = useMemo(() => infiniteData?.pages.flat() ?? [], [infiniteData])
  const hasMoreHistory = !!hasNextPage

  const loadMoreHistory = useCallback(() => {
    if (hasNextPage && !isFetchingMore) fetchNextPage()
  }, [hasNextPage, isFetchingMore, fetchNextPage])

  useEffect(() => {
    if (!open || !hasMoreHistory) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreHistory()
      },
      { rootMargin: '100px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, hasMoreHistory, loadMoreHistory])

  const filtered =
    statusFilter === 'all' ? history : history.filter((h) => h.runStatus === statusFilter)

  const groups = groupByDate(filtered)

  const toggleExpand = useCallback(
    (runId: string | null) => {
      setExpandedRunId((prev) => {
        const next = prev === runId ? null : runId
        if (next) onSelectRun(next)
        return next
      })
    },
    [onSelectRun],
  )

  const showSkeleton = isLoadingHistory && history.length === 0

  return (
    <>
      <Drawer
        open={open}
        onClose={onClose}
        side="right"
        width="w-80 sm:w-[28rem] lg:w-[32rem]"
        title="Execution History"
      >
        <div className="space-y-4">
          {/* Lock screen */}
          {isLocked && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-surface-border bg-surface-raised px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-yellow-500/10">
                <Lock size={18} className="text-primary-yellow-600" />
              </div>
              {lockReason === 'unauthenticated' ? (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                      Sign in to view executions
                    </p>
                    <p className="text-xs text-greyscale-500 dark:text-greyscale-400">
                      Your execution history is private and requires a signed-in account.
                    </p>
                  </div>
                  {onSignIn && (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="rounded-2xl bg-primary-yellow-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-yellow-600"
                    >
                      Sign in
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                      Lenser profile required
                    </p>
                    <p className="text-xs text-greyscale-500 dark:text-greyscale-400">
                      Create a Lenser profile to run lenses and track your execution history.
                    </p>
                  </div>
                  {onSignIn && (
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="rounded-2xl bg-primary-yellow-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-yellow-600"
                    >
                      Set up profile
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {!isLocked && <FilterBar status={statusFilter} onStatusChange={setStatusFilter} />}

          {!isLocked &&
            (showSkeleton ? (
              <SkeletonList />
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-greyscale-400">
                No executions found.{statusFilter !== 'all' && ' Try a different filter.'}
              </p>
            ) : (
              <div className="space-y-5">
                {groups.map((group) => (
                  <div key={group.label} className="space-y-2">
                    {/* Date group header */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-greyscale-400">
                        {group.label}
                      </span>
                      <div className="h-px flex-1 bg-surface-border" />
                    </div>

                    {group.items.map((item) => {
                      const isExpanded = expandedRunId === item.runId
                      return (
                        <div
                          key={item.requestId}
                          className={`rounded-xl border transition-colors ${
                            isExpanded
                              ? 'border-primary-yellow-500/40 bg-primary-yellow-500/5'
                              : 'border-surface-border bg-surface-base'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.runId)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              {/* Row 1: status · provider · model · local badge */}
                              <div className="flex flex-wrap items-center gap-2">
                                <RunStatusBadge status={item.runStatus} />
                                {item.providerKey && (
                                  <span className="text-[11px] font-medium uppercase text-greyscale-500">
                                    {item.providerKey}
                                  </span>
                                )}
                                {item.modelKey && (
                                  <span className="max-w-[120px] truncate text-xs text-greyscale-600 dark:text-greyscale-400">
                                    {item.modelKey}
                                  </span>
                                )}
                                {item.fundingSource === 'user_byok_local' && (
                                  <Badge color="blue" variant="outline">
                                    Local
                                  </Badge>
                                )}
                              </div>
                              {/* Row 2: time · tokens · credits · latency · version */}
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-greyscale-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(item.createdAt).toLocaleTimeString(undefined, {
                                    timeStyle: 'short',
                                  })}
                                </span>
                                {(item.tokenInput || item.tokenOutput) && (
                                  <span className="flex items-center gap-1">
                                    <Zap size={10} />
                                    {item.tokenInput ?? 0}→{item.tokenOutput ?? 0}
                                  </span>
                                )}
                                {item.creditCost != null && item.creditCost > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Coins size={10} />
                                    {item.creditCost}cr
                                  </span>
                                )}
                                {item.latencyMs != null && (
                                  <span className="flex items-center gap-1">
                                    <Timer size={10} />
                                    {formatLatency(item.latencyMs)}
                                  </span>
                                )}
                                {item.versionNumber != null && (
                                  <span className="flex items-center gap-1">
                                    <Hash size={10} />
                                    v{item.versionNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp size={14} className="flex-shrink-0 text-greyscale-400" />
                            ) : (
                              <ChevronDown size={14} className="flex-shrink-0 text-greyscale-400" />
                            )}
                          </button>

                          {isExpanded && item.runId && (
                            <div className="border-t border-surface-border px-3 pb-3">
                              <RunArtifactsByType
                                runId={item.runId}
                                onPreview={setPreviewArtifact}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {hasMoreHistory && <div ref={sentinelRef} className="h-2" />}
                {isFetchingMore && filtered.length > 0 && (
                  <div className="flex justify-center py-2">
                    <Loader2 size={12} className="animate-spin text-greyscale-400" />
                  </div>
                )}
              </div>
            ))}
        </div>
      </Drawer>

      <ArtifactPreviewModal
        artifact={previewArtifact}
        isOpen={!!previewArtifact}
        onClose={() => setPreviewArtifact(null)}
      />
    </>
  )
}
