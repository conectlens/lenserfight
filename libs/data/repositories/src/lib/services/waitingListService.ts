import { SupabaseWaitingListRepository } from '../repositories/waitingListRepository'

const repo = new SupabaseWaitingListRepository()

/**
 * Facade:
 * Thin orchestration layer, no state
 */
export const waitingListService = {
  getIsInWaitingList(): Promise<boolean | null> {
    return repo.getIsInWaitingList()
  },

  toggleWaitingList(kvkkApproved: boolean): Promise<boolean> {
    return repo.toggleWaitingList(kvkkApproved)
  },
}
