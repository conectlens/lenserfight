/**
 * BattleLiveArena — split-screen live execution container.
 *
 * Three modes:
 *  - Executor:       Creator drives useBattleExecution live
 *  - Spectator Live: Non-creators see Realtime updates via useBattleLiveSubmission
 *  - Replay:         Post-execution, drives useReplayController × 2 with auto-loop
 */
import React from 'react'
import { Card } from '@lenserfight/ui/components'

import type { Battle, Contender, ContenderLensAssignmentRecord } from '../types/battle.types'
import type { StreamRecording } from '../types/battle-execution.types'
import { useBattleExecution } from '../hooks/useBattleExecution'
import { useBattleLiveSubmission } from '../hooks/useBattleLiveSubmission'
import { useReplayController } from '../hooks/useReplayController'
import { StreamingOutput } from './StreamingOutput'
import { StreamStatusBar } from './StreamStatusBar'
import { LiveArenaTopBar } from './LiveArenaTopBar'
import { ReplayControls } from './ReplayControls'

interface BattleLiveArenaProps {
  battle: Battle
  contenderA: Contender | undefined
  contenderB: Contender | undefined
  lensAssignments: ContenderLensAssignmentRecord[]
  currentUserId?: string
  resolveLocalKey?: (id: string) => Promise<string>
  /** Pre-fetched stream recordings for replay mode */
  recordings?: StreamRecording[]
}

type ArenaMode = 'executor' | 'spectator' | 'replay'

function resolveMode(
  battle: Battle,
  currentUserId?: string,
  recordings?: StreamRecording[],
): ArenaMode {
  if (battle.status === 'executing' && currentUserId === battle.creator_lenser_id) {
    return 'executor'
  }
  if (battle.status === 'executing') {
    return 'spectator'
  }
  if (recordings && recordings.length > 0) {
    return 'replay'
  }
  return 'spectator'
}

export const BattleLiveArena: React.FC<BattleLiveArenaProps> = ({
  battle,
  contenderA,
  contenderB,
  lensAssignments,
  currentUserId,
  resolveLocalKey,
  recordings,
}) => {
  const mode = resolveMode(battle, currentUserId, recordings)
  const isCreator = currentUserId === battle.creator_lenser_id

  // --- Executor mode ---
  const execution = useBattleExecution({
    battle: mode === 'executor' ? battle : null,
    contenderA,
    contenderB,
    lensAssignments,
    currentUserId,
    resolveLocalKey,
  })

  // --- Spectator mode ---
  const liveSubmission = useBattleLiveSubmission(
    battle.id,
    contenderA,
    contenderB,
    mode === 'spectator',
  )

  // --- Replay mode ---
  const recordingA = recordings?.find((r) => r.slot === 'A')
  const recordingB = recordings?.find((r) => r.slot === 'B')

  const replayA = useReplayController({
    recording: recordingA ?? null,
    autoPlay: mode === 'replay',
  })
  const replayB = useReplayController({
    recording: recordingB ?? null,
    autoPlay: mode === 'replay',
  })

  // Derive content and streaming state for each slot
  let contentA = ''
  let contentB = ''
  let isStreamingA = false
  let isStreamingB = false

  if (mode === 'executor') {
    contentA = execution.executionState.contenderA.output
    contentB = execution.executionState.contenderB.output
    isStreamingA = execution.executionState.contenderA.state === 'streaming'
    isStreamingB = execution.executionState.contenderB.state === 'streaming'
  } else if (mode === 'spectator') {
    contentA = liveSubmission.liveOutputA
    contentB = liveSubmission.liveOutputB
    isStreamingA = liveSubmission.isStreamingA
    isStreamingB = liveSubmission.isStreamingB
  } else if (mode === 'replay') {
    contentA = replayA.output
    contentB = replayB.output
    isStreamingA = replayA.state === 'playing'
    isStreamingB = replayB.state === 'playing'
  }

  return (
    <Card className="overflow-hidden border border-surface-border">
      <LiveArenaTopBar
        phase={mode === 'executor' ? execution.executionState.phase : mode === 'replay' ? 'complete' : 'executing'}
        startedAt={mode === 'executor' ? execution.executionState.startedAt : null}
        isCreator={isCreator}
        onAbort={mode === 'executor' ? execution.abortExecution : undefined}
        mode={mode}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-border">
        {/* Contender A */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-border bg-surface-raised/30">
            <span className="text-xs font-bold text-greyscale-900 dark:text-greyscale-50 bg-greyscale-100 dark:bg-greyscale-800 rounded px-1.5 py-0.5">
              A
            </span>
            <span className="text-sm font-semibold text-greyscale-700 dark:text-greyscale-200 truncate">
              {contenderA?.display_name ?? 'Contender A'}
            </span>
          </div>
          <StreamingOutput content={contentA} isStreaming={isStreamingA} className="p-4 min-h-[200px]" />
          {mode === 'executor' && <StreamStatusBar snapshot={execution.executionState.contenderA} />}
        </div>

        {/* Contender B */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-surface-border bg-surface-raised/30">
            <span className="text-xs font-bold text-greyscale-900 dark:text-greyscale-50 bg-greyscale-100 dark:bg-greyscale-800 rounded px-1.5 py-0.5">
              B
            </span>
            <span className="text-sm font-semibold text-greyscale-700 dark:text-greyscale-200 truncate">
              {contenderB?.display_name ?? 'Contender B'}
            </span>
          </div>
          <StreamingOutput content={contentB} isStreaming={isStreamingB} className="p-4 min-h-[200px]" />
          {mode === 'executor' && <StreamStatusBar snapshot={execution.executionState.contenderB} />}
        </div>
      </div>

      {/* Replay controls */}
      {mode === 'replay' && recordingA && (
        <ReplayControls
          state={replayA.state}
          progress={replayA.progress}
          positionMs={replayA.positionMs}
          durationMs={replayA.durationMs}
          speed={replayA.speed}
          onPlay={() => { replayA.play(); replayB.play() }}
          onPause={() => { replayA.pause(); replayB.pause() }}
          onSeek={(ms) => { replayA.seek(ms); replayB.seek(ms) }}
          onSetSpeed={(s) => { replayA.setSpeed(s); replayB.setSpeed(s) }}
          onRestart={() => { replayA.restart(); replayB.restart() }}
        />
      )}
    </Card>
  )
}
