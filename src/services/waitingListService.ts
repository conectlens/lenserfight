import { getWaitingListRepository } from '../adapters/waitingListAdapter'

const repo = getWaitingListRepository()

// This file is deprecated. Waiting list logic is now part of LenserService/LenserContext.
export const waitingListService = {
  toggleWaitingList: async (kvkkApproved: boolean): Promise<void> => {
    return repo.toggleWaitingList(kvkkApproved)
  },
}
