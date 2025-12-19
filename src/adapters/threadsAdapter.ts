import { isMock } from '../config/runtimeConfig'
import {
  ThreadsRepositoryPort,
  MockThreadsRepository,
  SupabaseThreadsRepository,
} from '../repositories/threadsRepository'

export const getThreadsRepository = (): ThreadsRepositoryPort => {
  if (isMock) {
    return new MockThreadsRepository()
  }
  return new SupabaseThreadsRepository()
}
