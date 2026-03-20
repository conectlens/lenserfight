import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Check, LayoutPanelLeft, Coins } from 'lucide-react'
import { executionService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { ExecutionArtifact, WalletExecuteResponse } from '@lenserfight/types'

interface LabArtifactViewerProps {
  selectedRunId: string | null
  comparisonRunIds: string[]
  latestResult?: WalletExecuteResponse | null
}

interface ArtifactBlockProps {
  artifact: ExecutionArtifact
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
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

const ArtifactBlock: React.FC<ArtifactBlockProps> = ({ artifact }) => {
  if (artifact.artifactKind === 'text' && artifact.contentText) {
    return (
      <div className="relative">
        <div className="absolute top-2 right-2">
          <CopyButton text={artifact.contentText} />
        </div>
        <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 pr-16 border border-gray-200 dark:border-gray-700 font-mono leading-relaxed">
          {artifact.contentText}
        </pre>
      </div>
    )
  }

  if (artifact.artifactKind === 'json' && artifact.contentJson !== null) {
    const pretty = JSON.stringify(artifact.contentJson, null, 2)
    return (
      <div className="relative">
        <div className="absolute top-2 right-2">
          <CopyButton text={pretty} />
        </div>
        <pre className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 pr-16 border border-gray-200 dark:border-gray-700 font-mono leading-relaxed">
          {pretty}
        </pre>
      </div>
    )
  }

  // image / audio / video / other — placeholder
  return (
    <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500">
      Media output ({artifact.artifactKind}) — coming soon
    </div>
  )
}

const RunArtifacts: React.FC<{ runId: string; showAll: boolean }> = ({ runId, showAll }) => {
  const { data: artifacts = [], isLoading } = useQuery({
    queryKey: queryKeys.executions.artifacts(runId),
    queryFn: () => executionService.getArtifacts(runId),
    enabled: !!runId,
    staleTime: 5 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
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
        <ArtifactBlock key={artifact.id} artifact={artifact} />
      ))}
    </div>
  )
}

export const LabArtifactViewer: React.FC<LabArtifactViewerProps> = ({
  selectedRunId,
  comparisonRunIds,
  latestResult,
}) => {
  const [showAll, setShowAll] = useState(false)

  const isComparing = comparisonRunIds.length === 2

  // Show the latest sync result if nothing from history is selected
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
      <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500">
        Select an execution to view its output.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
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

      {/* Comparison: 2-column grid */}
      {isComparing ? (
        <div className="grid grid-cols-2 gap-4">
          {comparisonRunIds.map((runId, i) => (
            <div key={runId} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Run {i + 1}
              </span>
              <RunArtifacts runId={runId} showAll={showAll} />
            </div>
          ))}
        </div>
      ) : (
        selectedRunId && <RunArtifacts runId={selectedRunId} showAll={showAll} />
      )}
    </div>
  )
}
