import { isMock } from '../config/runtimeConfig'
import {
  MockWaitingListRepository,
  SupabaseWaitingListRepository,
  WaitingListRepositoryPort,
} from '../repositories/waitingListRepository'

export const getWaitingListRepository = (): WaitingListRepositoryPort => {
  if (isMock) {
    return new MockWaitingListRepository()
  }
  return new SupabaseWaitingListRepository()
}
