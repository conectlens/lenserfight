import {
  ThreadsRepositoryPort,
  SupabaseThreadsRepository,
} from '../repositories/threadsRepository'

export const getThreadsRepository = (): ThreadsRepositoryPort => {
  return new SupabaseThreadsRepository()
}
