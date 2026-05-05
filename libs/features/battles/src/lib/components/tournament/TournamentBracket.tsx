import { motion } from 'framer-motion'
import { Swords, Trophy, Clock } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import type { TournamentMatchRecord } from '@lenserfight/data/repositories'

interface MatchSlotProps {
  lenserId: string | null
  isWinner: boolean
  label: string
}

function MatchSlot({ lenserId, isWinner, label }: MatchSlotProps) {
  if (!lenserId) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-greyscale-800 px-3 py-2 opacity-40">
        <span className="text-xs text-greyscale-500">{label}</span>
      </div>
    )
  }

  return (
    <div
      className={[
        'flex items-center gap-2 rounded-lg px-3 py-2 transition-colors',
        isWinner
          ? 'bg-yellow-900/30 border border-yellow-700/50'
          : 'bg-greyscale-800',
      ].join(' ')}
    >
      {isWinner && <Trophy size={12} className="text-yellow-400 shrink-0" />}
      <span
        className={['text-xs font-medium truncate max-w-[120px]', isWinner ? 'text-yellow-300' : 'text-greyscale-200'].join(' ')}
      >
        {lenserId.slice(0, 8)}…
      </span>
    </div>
  )
}

interface BracketMatchProps {
  match: TournamentMatchRecord
}

function BracketMatch({ match }: BracketMatchProps) {
  const isPending = !match.battle_id
  const isComplete = !!match.winner_lenser_id

  const inner = (
    <div
      className={[
        'rounded-xl border p-3 flex flex-col gap-1.5 w-44',
        isPending ? 'border-greyscale-800 opacity-50' : 'border-greyscale-700',
        isComplete ? 'border-yellow-800/50' : '',
      ].join(' ')}
    >
      <MatchSlot
        lenserId={match.contender_a_lenser_id}
        isWinner={match.winner_lenser_id === match.contender_a_lenser_id}
        label="TBD"
      />
      <div className="flex items-center justify-center">
        <Swords size={10} className="text-greyscale-600" />
      </div>
      <MatchSlot
        lenserId={match.contender_b_lenser_id}
        isWinner={match.winner_lenser_id === match.contender_b_lenser_id}
        label="TBD"
      />
      {isPending && (
        <div className="flex items-center gap-1 text-[10px] text-greyscale-600 mt-1">
          <Clock size={9} />
          Pending
        </div>
      )}
    </div>
  )

  if (match.battle_slug) {
    return (
      <Link to={`/battles/${match.battle_slug}`} className="hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    )
  }

  return inner
}

interface RoundColumnProps {
  roundNumber: number
  status: string
  matches: TournamentMatchRecord[]
}

function RoundColumn({ roundNumber, status, matches }: RoundColumnProps) {
  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-xs font-semibold text-greyscale-300">Round {roundNumber}</span>
        {status === 'active' && (
          <span className="rounded-full bg-yellow-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">
            Live
          </span>
        )}
        {status === 'completed' && (
          <span className="rounded-full bg-blue-900/30 px-1.5 py-0.5 text-[10px] text-blue-400">
            Done
          </span>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {matches.map((m) => (
          <motion.div
            key={m.match_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <BracketMatch match={m} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}

interface TournamentBracketProps {
  matches: TournamentMatchRecord[]
}

export function TournamentBracket({ matches }: TournamentBracketProps) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-8 text-center">
        <Trophy size={28} className="mx-auto mb-2 text-greyscale-600" />
        <p className="text-sm text-greyscale-400">Tournament hasn't started yet.</p>
      </div>
    )
  }

  // Group by round
  const rounds = new Map<number, { status: string; matches: TournamentMatchRecord[] }>()
  for (const m of matches) {
    const existing = rounds.get(m.round_number) ?? { status: m.round_status, matches: [] }
    existing.matches.push(m)
    rounds.set(m.round_number, existing)
  }

  const roundNumbers = [...rounds.keys()].sort((a, b) => a - b)

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-12 pb-4 min-w-max items-start">
        {roundNumbers.map((rn) => {
          const round = rounds.get(rn)!
          return (
            <RoundColumn
              key={rn}
              roundNumber={rn}
              status={round.status}
              matches={round.matches}
            />
          )
        })}
      </div>
    </div>
  )
}
