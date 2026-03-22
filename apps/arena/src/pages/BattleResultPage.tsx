import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { ResultBanner } from '../components/ResultBanner'
import { ContenderSlot } from '../components/ContenderSlot'
import { RubricPanel } from '../components/RubricPanel'
import { BattleShareCard } from '../components/BattleShareCard'

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
  slot: 'A' | 'B'
  contender_type: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
  display_name: string
}

interface Submission {
  contender_id: string
  content_text: string | null
  content_url: string | null
}

interface VoteAggregate {
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
  contender_id: string
  rubric_criterion_id: string
  result: 'pass' | 'fail' | 'partial' | 'skipped'
  explanation?: string
}

export function BattleResultPage() {
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

      const [
        { data: contenderData },
        { data: submissionData },
        { data: aggregateData },
        { data: scorecardData },
      ] = await Promise.all([
        client
          .schema('battles')
          .from('contenders')
          .select('id, slot, contender_type, display_name')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('submissions')
          .select('contender_id, content_text, content_url')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('vote_aggregates')
          .select('contender_id, raw_vote_count, rank_position')
          .eq('battle_id', battleId),
        client
          .schema('battles')
          .from('scorecards')
          .select('contender_id, rubric_criterion_id, result, explanation')
          .eq('battle_id', battleId),
      ])

      setContenders((contenderData as Contender[]) ?? [])
      setSubmissions((submissionData as Submission[]) ?? [])
      setVoteAggregates((aggregateData as VoteAggregate[]) ?? [])
      setScorecards((scorecardData as Scorecard[]) ?? [])

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
        <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
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

  const voteCountA = aggregateA?.raw_vote_count ?? 0
  const voteCountB = aggregateB?.raw_vote_count ?? 0

  // Determine winner from rank_position (rank 1 = winner)
  let winnerSlot: 'A' | 'B' | 'draw' | undefined
  let winnerName: string | undefined

  if (aggregateA && aggregateB) {
    if (aggregateA.rank_position === 1 && aggregateB.rank_position !== 1) {
      winnerSlot = 'A'
      winnerName = contenderA?.display_name
    } else if (aggregateB.rank_position === 1 && aggregateA.rank_position !== 1) {
      winnerSlot = 'B'
      winnerName = contenderB?.display_name
    } else if (voteCountA === voteCountB && voteCountA > 0) {
      winnerSlot = 'draw'
    }
  }

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Back link + title */}
      <div>
        <Link to={`/battles/${battle.slug}`} className="text-xs text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Back to Battle
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{battle.title}</h1>
        <p className="text-sm text-gray-500 mt-1">{battle.task_prompt}</p>
      </div>

      {/* Result banner */}
      <ResultBanner
        winnerName={winnerName}
        winnerSlot={winnerSlot}
        voteA={voteCountA}
        voteB={voteCountB}
      />

      {/* Side-by-side contenders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contenderA ? (
          <ContenderSlot
            slot="A"
            displayName={contenderA.display_name}
            contenderType={contenderA.contender_type}
            contentText={submissionA?.content_text}
            contentUrl={submissionA?.content_url}
            voteCount={voteCountA}
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
            voteCount={voteCountB}
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-center justify-center text-gray-400 text-sm">
            No contender B
          </div>
        )}
      </div>

      {/* Rubric panel */}
      {rubricCriteria.length > 0 && (
        <RubricPanel criteria={rubricCriteria} scorecardA={scorecardA} scorecardB={scorecardB} />
      )}

      {/* Share card */}
      <BattleShareCard battleSlug={battle.slug} battleTitle={battle.title} />
    </div>
  )
}
