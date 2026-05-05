import { EmptyState, SEOHead } from '@lenserfight/ui/components'
import { tournamentRepository } from '@lenserfight/data/repositories'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { motion } from 'framer-motion'
import { Trophy, Users, Zap, Play } from 'lucide-react'
import React from 'react'
import { useParams, Link } from 'react-router-dom'

import { TournamentBracket } from '../components/tournament/TournamentBracket'

const STATUS_LABELS = {
  pending:      'Pending',
  registration: 'Registration Open',
  active:       'In Progress',
  completed:    'Completed',
  cancelled:    'Cancelled',
}

export function TournamentPage() {
  const { slug } = useParams<{ slug: string }>()
  const qc = useQueryClient()

  const { data: tournament, isLoading } = useQuery({
    queryKey: [...queryKeys.battles.all, 'tournament', slug],
    queryFn:  () => tournamentRepository.getTournament(slug ?? ''),
    enabled:  !!slug,
  })

  const { data: bracket = [] } = useQuery({
    queryKey: [...queryKeys.battles.all, 'tournament-bracket', tournament?.id],
    queryFn:  () => tournamentRepository.getTournamentBracket(tournament!.id),
    enabled:  !!tournament?.id,
    refetchInterval: tournament?.status === 'active' ? 10_000 : false,
  })

  const { data: contenders = [] } = useQuery({
    queryKey: [...queryKeys.battles.all, 'tournament-contenders', tournament?.id],
    queryFn:  () => tournamentRepository.getTournamentContenders(tournament!.id),
    enabled:  !!tournament?.id,
  })

  const registerMutation = useMutation({
    mutationFn: () => tournamentRepository.registerContender(tournament!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.battles.all, 'tournament-contenders', tournament!.id] })
    },
  })

  const startMutation = useMutation({
    mutationFn: () => tournamentRepository.startTournament(tournament!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...queryKeys.battles.all, 'tournament', slug] })
      qc.invalidateQueries({ queryKey: [...queryKeys.battles.all, 'tournament-bracket', tournament!.id] })
    },
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-8 w-64 rounded-lg bg-greyscale-800 animate-pulse mb-4" />
        <div className="h-48 rounded-xl bg-greyscale-800 animate-pulse" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <EmptyState
        icon={<Trophy size={32} className="text-greyscale-600" />}
        title="Tournament not found"
        description="This tournament does not exist or has been removed."
      />
    )
  }

  return (
    <>
      <SEOHead
        title={`${tournament.title} — Tournament — LenserFight`}
        description={`${STATUS_LABELS[tournament.status]} · ${tournament.format.replace(/_/g, ' ')} · ${tournament.max_contenders} contenders`}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-yellow-400" />
            <h1 className="text-xl font-bold text-greyscale-100">{tournament.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-greyscale-400">
            <span className="capitalize">{tournament.format.replace(/_/g, ' ')}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Users size={13} />
              {contenders.length} / {tournament.max_contenders} registered
            </span>
            {tournament.ai_judge_enabled && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Zap size={13} />
                  AI Judge
                </span>
              </>
            )}
            <span>·</span>
            <span
              className={
                tournament.status === 'active'
                  ? 'text-yellow-400'
                  : tournament.status === 'completed'
                  ? 'text-blue-400'
                  : 'text-greyscale-400'
              }
            >
              {STATUS_LABELS[tournament.status]}
            </span>
          </div>
        </motion.div>

        {/* Action buttons */}
        {tournament.status === 'registration' && (
          <div className="flex gap-3">
            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              className="flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 transition-colors disabled:opacity-50"
            >
              <Users size={15} />
              {registerMutation.isPending ? 'Registering…' : 'Register'}
            </button>
            {contenders.length >= 2 && (
              <button
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isPending}
                className="flex items-center gap-2 rounded-xl border border-greyscale-700 px-4 py-2 text-sm font-semibold text-greyscale-200 hover:bg-greyscale-800 transition-colors disabled:opacity-50"
              >
                <Play size={15} />
                {startMutation.isPending ? 'Starting…' : 'Start Tournament'}
              </button>
            )}
          </div>
        )}

        {/* Contenders list (registration phase) */}
        {tournament.status === 'registration' && contenders.length > 0 && (
          <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 space-y-2">
            <p className="text-xs font-semibold text-greyscale-400 uppercase tracking-wide">Registered</p>
            {contenders.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-sm text-greyscale-300">{c.lenser_id.slice(0, 8)}…</span>
                {c.status === 'winner' && <Trophy size={12} className="text-yellow-400" />}
              </div>
            ))}
          </div>
        )}

        {/* Bracket */}
        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-greyscale-300 uppercase tracking-wide">Bracket</h2>
            <TournamentBracket matches={bracket} />
          </div>
        )}

        {/* Winner */}
        {tournament.status === 'completed' && (() => {
          const winner = contenders.find((c) => c.status === 'winner')
          return winner ? (
            <div className="rounded-xl border border-yellow-800/50 bg-yellow-900/10 p-5 text-center space-y-1">
              <Trophy size={24} className="mx-auto text-yellow-400" />
              <p className="text-sm font-bold text-yellow-300">Tournament Winner</p>
              <p className="text-greyscale-200">{winner.lenser_id.slice(0, 8)}…</p>
            </div>
          ) : null
        })()}
      </div>
    </>
  )
}
