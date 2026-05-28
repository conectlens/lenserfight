
import { createWaitingListRepository } from '../factory'

const repo = createWaitingListRepository()

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
