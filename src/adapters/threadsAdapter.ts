import { ThreadsRepositoryPort, MockThreadsRepository, SupabaseThreadsRepository } from '../repositories/threadsRepository';
import { isMock } from '../config/runtimeConfig';

export const getThreadsRepository = (): ThreadsRepositoryPort => {
  if (isMock) {
    return new MockThreadsRepository();
  }
  return new SupabaseThreadsRepository();
};
