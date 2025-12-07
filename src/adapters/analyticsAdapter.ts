
import { AnalyticsRepositoryPort, MockAnalyticsRepository, SupabaseAnalyticsRepository } from '../repositories/analyticsRepository';
import { isMock } from '../config/runtimeConfig';

export const getAnalyticsRepository = (): AnalyticsRepositoryPort => {
  if (isMock) {
    return new MockAnalyticsRepository();
  }
  return new SupabaseAnalyticsRepository();
};
