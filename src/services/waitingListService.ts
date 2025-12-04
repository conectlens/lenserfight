
import { getWaitingListRepository } from '../adapters/waitingListAdapter';
import { JoinWaitingListDTO, WaitingListEntry } from '../types/waitingList.types';

const repo = getWaitingListRepository();

export const waitingListService = {
  join: async (dto: JoinWaitingListDTO): Promise<WaitingListEntry> => {
    if (!dto.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email)) {
        throw new Error("Invalid email format.");
    }
    if (!dto.kvkk_approved) {
        throw new Error("You must approve the privacy policy (KVKK) to join.");
    }
    if (!dto.lenser_id) {
        throw new Error("Must be a Lenser to join.");
    }

    return repo.joinList(dto);
  },

  checkStatus: async (lenserId: string): Promise<boolean> => {
      if (!lenserId) return false;
      return repo.checkMembership(lenserId);
  }
};
