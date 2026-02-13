import {
  AnalyticsRepositoryPort,
  SupabaseAnalyticsRepository,
} from '../repositories/analyticsRepository'

export const getAnalyticsRepository = (): AnalyticsRepositoryPort => {
  return new SupabaseAnalyticsRepository()
}
