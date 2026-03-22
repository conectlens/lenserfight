import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { ContenderSlot } from '../components/ContenderSlot'
import { VotePanel } from '../components/VotePanel'
import { RubricPanel } from '../components/RubricPanel'
import { BattleStatusBadge } from '../components/BattleStatusBadge'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface Battle {
  id: string
  slug: string
  title: string
  task_prompt: string
  status: string
  total_vote_count: number
  published_at: string | null
}

interface Contender {
  id: string
  battle_id: string
  slot: 'A' | 'B'
  contender_type: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
  display_name: string
}

interface Submission {
  id: string
  battle_id: string
  contender_id: string
  content_text: string | null
  content_url: string | null
  status: string
}

interface VoteAggregate {
  battle_id: string
  contender_id: string
  raw_vote_count: number
  rank_position: number | null
}

interface RubricCriterion {
  id: string
  name: string
  description?: string
  weight: number
}

interface Scorecard {
  id: string
  battle_id: string
  contender_id: string
  rubric_criterion_id: string
  result: 'pass' | 'fail' | 'partial' | 'skipped'
  explanation?: string
}

export function BattleDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const [battle, setBattle] = useState<Battle | null>(null)
  const [contenders, setContenders] = useState<Contender[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [voteAggregates, setVoteAggregates] = useState<VoteAggregate[]>([])
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([])
  const [scorecards, setScorecards] = useState<Scorecard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const client = createClient(supabaseUrl, supabaseKey)

    async function fetchAll() {
      setLoading(true)
      setError(null)

      // Fetch battle by slug
      const { data: battleData, error: battleError } = await client
        .schema('battles')
        .from('battles')
        .select('id, slug, title, task_prompt, status, total_vote_count, published_at')
        .eq('slug', slug)
        .single()

      if (battleError || !battleData) {
        setError('Battle not found.')
        setLoading(false)
        return
      }

      setBattle(battleData)
      const battleId = battleData.id

      // Fetch contenders, submissions, vote aggregates, scorecards in parallel
      const [
        { data: contenderData },
        { data: submissionData },
        { data: aggregateData },
        { data: scorecardData },
      ] = await Promise.all([
        client
          .schema('battles')
          .from('contenders')
          .select('id, battle_id, slot, contender_type, display_name')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('submissions')
          .select('id, battle_id, contender_id, content_text, content_url, status')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('vote_aggregates')
          .select('battle_id, contender_id, raw_vote_count, rank_position')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('scorecards')
          .select('id, battle_id, contender_id, rubric_criterion_id, result, explanation')
          .eq('battle_id', battleId),
      ])

      setContenders((contenderData as Contender[]) ?? [])
      setSubmissions((submissionData as Submission[]) ?? [])
      setVoteAggregates((aggregateData as VoteAggregate[]) ?? [])
      setScorecards((scorecardData as Scorecard[]) ?? [])

      // Fetch rubric criteria if scorecards exist
      if (scorecardData && scorecardData.length > 0) {
        const criterionIds = [...new Set(scorecardData.map((s: Scorecard) => s.rubric_criterion_id))]
        const { data: criteriaData } = await client
          .schema('battles')
          .from('rubric_criteria')
          .select('id, name, description, weight')
          .in('id', criterionIds)

        setRubricCriteria((criteriaData as RubricCriterion[]) ?? [])
      }

      setLoading(false)
    }

    fetchAll()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || !battle) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-4xl mb-3">⚔️</p>
        <p className="font-medium">{error ?? 'Battle not found.'}</p>
        <Link to="/battles" className="text-sm text-blue-600 underline mt-3 inline-block">
          Back to battles
        </Link>
      </div>
    )
  }

  const contenderA = contenders.find((c) => c.slot === 'A')
  const contenderB = contenders.find((c) => c.slot === 'B')

  const submissionA = contenderA ? submissions.find((s) => s.contender_id === contenderA.id) : undefined
  const submissionB = contenderB ? submissions.find((s) => s.contender_id === contenderB.id) : undefined

  const aggregateA = contenderA ? voteAggregates.find((v) => v.contender_id === contenderA.id) : undefined
  const aggregateB = contenderB ? voteAggregates.find((v) => v.contender_id === contenderB.id) : undefined

  const scorecardA = contenderA
    ? scorecards
        .filter((s) => s.contender_id === contenderA.id)
        .map((s) => ({
          rubricCriterionId: s.rubric_criterion_id,
          result: s.result,
          explanation: s.explanation,
        }))
    : []

  const scorecardB = contenderB
    ? scorecards
        .filter((s) => s.contender_id === contenderB.id)
        .map((s) => ({
          rubricCriterionId: s.rubric_criterion_id,
          result: s.result,
          explanation: s.explanation,
        }))
    : []

  const isPublished = battle.status === 'published' || battle.status === 'closed'
  const canVote = battle.status === 'voting'

  const handleVote = async (value: 'contender_a' | 'contender_b' | 'draw', rationale: string) => {
    console.log('Vote submitted:', { battleId: battle.id, value, rationale })
    // TODO: implement actual vote submission via Supabase insert into battles.votes
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link to="/battles" className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
            ← All Battles
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{battle.title}</h1>
        </div>
        <BattleStatusBadge status={battle.status as any} />
      </div>

      {/* Task prompt */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Task</p>
        <p className="text-sm text-gray-800 leading-relaxed">{battle.task_prompt}</p>
      </div>

      {/* Contenders side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contenderA ? (
          <ContenderSlot
            slot="A"
            displayName={contenderA.display_name}
            contenderType={contenderA.contender_type}
            contentText={submissionA?.content_text}
            contentUrl={submissionA?.content_url}
            voteCount={aggregateA?.raw_vote_count}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm">
            No contender A
          </div>
        )}
        {contenderB ? (
          <ContenderSlot
            slot="B"
            displayName={contenderB.display_name}
            contenderType={contenderB.contender_type}
            contentText={submissionB?.content_text}
            contentUrl={submissionB?.content_url}
            voteCount={aggregateB?.raw_vote_count}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm">
            No contender B
          </div>
        )}
      </div>

      {/* Vote panel */}
      {contenderA && contenderB && (
        <VotePanel
          battleId={battle.id}
          contenderA={{ id: contenderA.id, displayName: contenderA.display_name }}
          contenderB={{ id: contenderB.id, displayName: contenderB.display_name }}
          existingVote={null}
          onVote={handleVote}
          disabled={!canVote}
        />
      )}

      {/* Rubric panel */}
      {rubricCriteria.length > 0 && (
        <RubricPanel criteria={rubricCriteria} scorecardA={scorecardA} scorecardB={scorecardB} />
      )}

      {/* Link to result page */}
      {isPublished && (
        <div className="text-center pt-2">
          <Link
            to={`/battles/${battle.slug}/result`}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 border border-gray-900 rounded-lg px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors"
          >
            See Full Result →
          </Link>
        </div>
      )}
    </div>
  )
}
