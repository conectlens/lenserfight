export type ReputationScoreType = 'elo' | 'trust' | 'composite'
export type VoteRiskReviewStatus = 'cleared' | 'flagged' | 'excluded' | 'appealed'

export interface LenserScoreRecord {
  id: string
  lenser_id: string
  score_type: ReputationScoreType
  score: number
  uncertainty: number
  computed_at: string
}

export interface ContenderRatingRecord {
  id: string
  lenser_id: string
  category: string
  elo_rating: number
  uncertainty: number
  battles_played: number
  wins: number
  draws: number
  losses: number
  updated_at: string
}

export interface JudgeCalibrationRecord {
  id: string
  lenser_id: string
  calibration_score: number
  total_judgments: number
  agreement_rate: number
  kappa_score: number | null
  updated_at: string
}

export interface VoteRiskScoreRecord {
  id: string
  vote_id: string
  risk_score: number
  risk_factors: string[]
  review_status: VoteRiskReviewStatus
  created_at: string
}
