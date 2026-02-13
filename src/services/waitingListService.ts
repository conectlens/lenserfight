import { getWaitingListRepository } from '../adapters/waitingListAdapter'

const repo = getWaitingListRepository()

/**
 * Facade:
 * Thin orchestration layer, no state
 */
export const waitingListService = {
  getIsInWaitingList(): Promise<boolean> {
    return repo.getIsInWaitingList()
  },

  toggleWaitingList(kvkkApproved: boolean): Promise<boolean> {
    return repo.toggleWaitingList(kvkkApproved)
  },
}
