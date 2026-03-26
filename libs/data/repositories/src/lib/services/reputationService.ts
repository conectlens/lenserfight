import {
  LenserScoreRecord,
  ContenderRatingRecord,
  JudgeCalibrationRecord,
} from '@lenserfight/types'
import {
  SupabaseReputationRepository,
  EloLeaderboardEntry,
} from '../repositories/reputationRepository'

export type { EloLeaderboardEntry }

const reputationRepo = new SupabaseReputationRepository()

export const reputationService = {
  getLenserScores: (lenserId: string): Promise<LenserScoreRecord[]> =>
    reputationRepo.getLenserScores(lenserId),

  getContenderRating: (lenserId: string, category?: string): Promise<ContenderRatingRecord | null> =>
    reputationRepo.getContenderRating(lenserId, category),

  getJudgeCalibration: (lenserId: string): Promise<JudgeCalibrationRecord | null> =>
    reputationRepo.getJudgeCalibration(lenserId),

  getEloLeaderboard: (limit?: number, offset?: number): Promise<EloLeaderboardEntry[]> =>
    reputationRepo.getEloLeaderboard(limit, offset),
}
