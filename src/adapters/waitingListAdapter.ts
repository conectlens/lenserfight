
import { WaitingListRepositoryPort, MockWaitingListRepository, SupabaseWaitingListRepository } from '../repositories/waitingListRepository';
import { isMock } from '../config/runtimeConfig';

export const getWaitingListRepository = (): WaitingListRepositoryPort => {
  if (isMock) {
    return new MockWaitingListRepository();
  }
  return new SupabaseWaitingListRepository();
};
