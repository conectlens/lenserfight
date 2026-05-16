import { queryKeys } from '@lenserfight/data/cache'
import { executionService, mediaRepository } from '@lenserfight/data/repositories'
import { ExecutionArtifact, ExecuteResponse, StreamState, StreamUsage, ArtifactVisibility } from '@lenserfight/types'
import { StreamingOutput, type StreamingErrorEnvelope } from '@lenserfight/ui/components'
import { MediaViewer } from '@lenserfight/ui/data-display'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, LayoutPanelLeft, Coins, Loader2, Eye, EyeOff, Users, Archive } from 'lucide-react'
import React, { useState } from 'react'

import { useArtifactVisibility } from '../hooks/useArtifactVisibility'

const FAILED_STATUSES = ['failed', 'canceled', 'timed_out'] as const

/**
 * Transient media result returned by the Local BYOK adapter. The provider
 * answered synchronously from the browser, so there is no server run to query;
 * we render the URL(s) inline until the user selects a different run.
 */
export interface LocalMediaArtifact {
  runId: string
  provider: string
  model: string
  modality: 'image' | 'video' | 'audio' | 'music'
  urls: string[]
  mimeType: string
  width?: number
  height?: number
  durationSeconds?: number
}

interface LabArtifactViewerProps {
  selectedRunId: string | null
  comparisonRunIds: string[]
  latestResult?: ExecuteResponse | null
  streamState: StreamState
  streamOutput: string
  streamRunId: string | null
  streamUsage: StreamUsage | null
  streamCredits: number | null
  streamError: StreamingErrorEnvelope | string | null
  /** Local BYOK only — set when the browser fetched media directly from the provider. */
  localMediaArtifact?: LocalMediaArtifact | null
  isOwner?: boolean
  isAuthenticatedLenser?: boolean
}

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

const VISIBILITY_OPTIONS: { value: ArtifactVisibility; icon: React.ElementType; label: string; color: string }[] = [
  { value: 'private', icon: EyeOff, label: 'Private', color: 'text-greyscale-500' },
  { value: 'public', icon: Eye, label: 'Public', color: 'text-status-green' },
  { value: 'contender_only', icon: Users, label: 'Community', color: 'text-status-blue' },
  { value: 'archived', icon: Archive, label: 'Archived', color: 'text-greyscale-500' },
]

function VisibilityToggle({
  artifactId,
  visibility,
  runId,
}: {
  artifactId: string
  visibility: ArtifactVisibility
  runId: string
}) {
  const [open, setOpen] = useState(false)
  const { setVisibility, isPending } = useArtifactVisibility(runId)
  const current = VISIBILITY_OPTIONS.find((o) => o.value === visibility) ?? VISIBILITY_OPTIONS[0]
  const Icon = current.icon

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`flex items-center gap-1 text-xs transition-colors ${current.color} hover:opacity-80 disabled:opacity-50`}
        title={`Visibility: ${current.label}`}
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-5 z-20 w-36 rounded-2xl border border-surface-border bg-surface-base py-1 shadow-lg">
          {VISIBILITY_OPTIONS.map((opt) => {
            const OptIcon = opt.icon
            return (
              <button
                key={opt.value}
                type="button"
                onClick={async () => {
                  setOpen(false)
                  await setVisibility({ artifactId, visibility: opt.value })
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-surface-raised ${opt.color} ${opt.value === visibility ? 'font-semibold' : ''}`}
              >
                <OptIcon size={12} />
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AudioWaveLoader() {
  return (
    <div className="flex items-center justify-center gap-[3px] h-16 px-4 bg-surface-raised rounded-xl" aria-label="Loading audio…">
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-1 rounded-full bg-greyscale-400 dark:bg-greyscale-500 opacity-70"
          style={{
            height: `${8 + Math.abs(Math.sin(i * 0.7)) * 24}px`,
            animationDelay: `${i * 60}ms`,
            animation: 'wave-bar 1.1s ease-in-out infinite alternate',
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar {
          from { transform: scaleY(0.4); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  )
}

function MediaArtifactBlock({ artifact, isOwner, runId }: { artifact: ExecutionArtifact; isOwner?: boolean; runId: string }) {
  // Resolve signed read URL when mediaObjectId is present
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ['media-signed-url', artifact.mediaObjectId],
    queryFn: () => mediaRepository.getSignedReadUrl(artifact.mediaObjectId!),
    enabled: !!artifact.mediaObjectId,
    staleTime: 50 * 60_000, // signed URLs valid ~1h
  })

  const mediaTypeFromKind = (): 'image' | 'video' | 'audio' | 'document' | 'text' | 'unknown' => {
    switch (artifact.artifactKind) {
      case 'image': return 'image'
      case 'audio': return 'audio'
      case 'video': return 'video'
      default: return 'unknown'
    }
  }

  const kind = mediaTypeFromKind()

  const renderLoader = () => {
    if (kind === 'audio') {
      return <AudioWaveLoader />
    }
    // image / video — square skeleton
    return (
      <div className="relative w-full aspect-square bg-surface-raised animate-pulse rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-greyscale-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-border">
      {isLoading ? renderLoader() : (
        <MediaViewer
          mediaType={kind}
          url={signedUrl ?? null}
          name={artifact.mediaObjectId ?? undefined}
        />
      )}
      {isOwner && (
        <div className="flex items-center justify-end border-t border-surface-border bg-surface-raised px-3 py-1.5">
          <VisibilityToggle
            artifactId={artifact.id}
            visibility={artifact.visibility as ArtifactVisibility}
            runId={runId}
          />
        </div>
      )}
    </div>
  )
}

const ArtifactBlock: React.FC<{ artifact: ExecutionArtifact; isOwner?: boolean; runId: string }> = ({
  artifact,
  isOwner,
  runId,
}) => {
  // Non-owners see only non-private artifacts
  if (!isOwner && artifact.visibility === 'private') return null

  if (artifact.artifactKind === 'text' && artifact.contentText) {
    return (
      <div className="overflow-hidden rounded-2xl border border-surface-border">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <CopyButton text={artifact.contentText} />
          </div>
          <pre className="whitespace-pre-wrap break-words bg-surface-raised p-4 pr-20 font-mono text-sm leading-relaxed text-greyscale-700 dark:text-greyscale-200">
            {artifact.contentText}
          </pre>
        </div>
        {isOwner && (
          <div className="flex items-center justify-end border-t border-surface-border bg-surface-raised px-3 py-1.5">
            <VisibilityToggle
              artifactId={artifact.id}
              visibility={artifact.visibility as ArtifactVisibility}
              runId={runId}
            />
          </div>
        )}
      </div>
    )
  }

  if (artifact.artifactKind === 'json' && artifact.contentJson !== null) {
    const pretty = JSON.stringify(artifact.contentJson, null, 2)
    return (
      <div className="overflow-hidden rounded-2xl border border-surface-border">
        <div className="relative">
          <div className="absolute top-2 right-2 z-10">
            <CopyButton text={pretty} />
          </div>
          <pre className="whitespace-pre-wrap break-words bg-surface-raised p-4 pr-16 font-mono text-sm leading-relaxed text-greyscale-700 dark:text-greyscale-200">
            {pretty}
          </pre>
        </div>
        {isOwner && (
          <div className="flex items-center justify-end border-t border-surface-border bg-surface-raised px-3 py-1.5">
            <VisibilityToggle
              artifactId={artifact.id}
              visibility={artifact.visibility as ArtifactVisibility}
              runId={runId}
            />
          </div>
        )}
      </div>
    )
  }

  // image / video / audio — use MediaViewer
  if (['image', 'video', 'audio'].includes(artifact.artifactKind)) {
    return <MediaArtifactBlock artifact={artifact} isOwner={isOwner} runId={runId} />
  }

  // Binary / other — download link if mediaObjectId resolves
  if (artifact.mediaObjectId) {
    return <MediaArtifactBlock artifact={artifact} isOwner={isOwner} runId={runId} />
  }

  return null
}

/**
 * Inline renderer for Local BYOK media results — the provider returned URL(s)
 * synchronously to the browser, so no run/artifact record exists in the DB.
 */
const LocalMediaArtifactView: React.FC<{ artifact: LocalMediaArtifact }> = ({ artifact }) => {
  const { modality, urls, mimeType, provider, model, width, height, durationSeconds } = artifact
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 capitalize">{modality}</span>
          <span className="text-[10px] uppercase tracking-wide text-greyscale-400">Local BYOK</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span>{provider}</span>
          <span>·</span>
          <span className="truncate max-w-[160px]" title={model}>{model}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="rounded-2xl overflow-hidden border border-surface-border bg-surface-raised">
            {modality === 'image' ? (
              <img
                src={url}
                alt={`Generated ${modality} ${i + 1}`}
                width={width}
                height={height}
                className="w-full h-auto"
              />
            ) : modality === 'video' ? (
              <video src={url} controls className="w-full h-auto" />
            ) : (
              // audio / music
              <div className="flex flex-col gap-2 p-4">
                <audio src={url} controls className="w-full" />
                {durationSeconds != null && (
                  <span className="text-[11px] text-greyscale-400">{durationSeconds.toFixed(1)}s</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-greyscale-400">
        Generated directly by your browser using your local BYOK key. The result is not stored on LenserFight servers; download or save it locally before navigating away. ({mimeType})
      </p>
    </div>
  )
}

const RunArtifacts: React.FC<{ runId: string; showAll: boolean; isOwner?: boolean }> = ({
  runId,
  showAll,
  isOwner,
}) => {
  const { data: run } = useQuery({
    queryKey: queryKeys.executions.run(runId),
    queryFn: () => executionService.pollRunStatus(runId),
    enabled: !!runId,
    staleTime: 60_000,
  })

  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: queryKeys.executions.artifacts(runId),
    queryFn: () => executionService.getArtifacts(runId),
    enabled: !!runId,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 animate-pulse">
        <div className="h-4 w-3/4 rounded bg-surface-raised" />
        <div className="h-24 rounded bg-surface-raised" />
      </div>
    )
  }

  // Never show artifacts from non-succeeded runs
  const runStatus = run?.status
  if (runStatus && FAILED_STATUSES.includes(runStatus as typeof FAILED_STATUSES[number])) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
        Output not available for {runStatus} runs.
      </p>
    )
  }

  const displayed = showAll ? artifacts : artifacts.filter((a) => a.isPrimaryOutput)

  if (displayed.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No output artifacts.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {displayed.map((artifact) => (
        <ArtifactBlock key={artifact.id} artifact={artifact} isOwner={isOwner} runId={runId} />
      ))}
    </div>
  )
}

export const LabArtifactViewer: React.FC<LabArtifactViewerProps> = ({
  selectedRunId,
  comparisonRunIds,
  latestResult,
  streamState,
  streamOutput,
  streamRunId,
  streamUsage,
  streamCredits,
  streamError,
  localMediaArtifact,
  isOwner,
  isAuthenticatedLenser = false,
}) => {
  const [showAll, setShowAll] = useState(false)
  const isComparing = comparisonRunIds.length === 2

  if (streamState !== 'idle') {
    return (
      <StreamingOutput
        state={streamState}
        output={streamOutput}
        runId={streamRunId}
        usage={streamUsage}
        credits={streamCredits}
        error={streamError}
      />
    )
  }

  // Local BYOK media — render the provider's URLs directly. No DB run to query
  // for; takes priority over selectedRunId until the user picks another run.
  if (localMediaArtifact && !isComparing && (!selectedRunId || selectedRunId === localMediaArtifact.runId)) {
    return <LocalMediaArtifactView artifact={localMediaArtifact} />
  }

  if (!selectedRunId && !isComparing) {
    if (latestResult) {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutPanelLeft size={16} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Output</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              <Coins size={12} />
              <span>{latestResult.credits_charged} cr</span>
              <span>·</span>
              <span>{latestResult.usage.input_tokens + latestResult.usage.output_tokens} tokens</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-2 right-2">
              <CopyButton text={latestResult.content} />
            </div>
            <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 pr-16 border border-gray-200 dark:border-gray-700 font-mono leading-relaxed">
              {latestResult.content}
            </pre>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-3">
        <h2 className="font-semibold mb-2 text-gray-800 dark:text-gray-100">Executions</h2>
        <div className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500">
          {isAuthenticatedLenser ? (
            'Select an execution to view its output.'
          ) : (
            <>
              <span>Sign in or register to view execution output.</span>
              <a
                href="/sign-in"
                className="text-xs font-medium text-primary-yellow-600 hover:text-primary-yellow-700 transition-colors underline-offset-2 hover:underline"
              >
                Sign in →
              </a>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutPanelLeft size={16} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {isComparing ? 'Comparison' : 'Output'}
          </span>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show all artifacts
        </label>
      </div>

      {isComparing ? (
        <div className="grid grid-cols-2 gap-4">
          {comparisonRunIds.map((runId, i) => (
            <div key={runId} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Run {i + 1}
              </span>
              <RunArtifacts runId={runId} showAll={showAll} isOwner={isOwner} />
            </div>
          ))}
        </div>
      ) : (
        selectedRunId && <RunArtifacts runId={selectedRunId} showAll={showAll} isOwner={isOwner} />
      )}
    </div>
  )
}
