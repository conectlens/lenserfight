import { isMock } from '../config/runtimeConfig'
import {
  AnalyticsRepositoryPort,
  MockAnalyticsRepository,
  SupabaseAnalyticsRepository,
} from '../repositories/analyticsRepository'

export const getAnalyticsRepository = (): AnalyticsRepositoryPort => {
  if (isMock) {
    return new MockAnalyticsRepository()
  }
  return new SupabaseAnalyticsRepository()
}
