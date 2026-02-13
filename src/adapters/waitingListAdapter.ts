import {
  SupabaseWaitingListRepository,
  WaitingListRepositoryPort,
} from '../repositories/waitingListRepository'

export const getWaitingListRepository = (): WaitingListRepositoryPort => {
  return new SupabaseWaitingListRepository()
}
