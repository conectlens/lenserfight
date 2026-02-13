import { supabase } from '../utils/supabase'

export interface WaitingListRepositoryPort {
  getIsInWaitingList(): Promise<boolean>
  toggleWaitingList(kvkkApproved: boolean): Promise<boolean>
}

/**
 * ============================
 * Mock Implementation
 * ============================
 * Used in dev / tests / storybook
 */
export class MockWaitingListRepository
  implements WaitingListRepositoryPort {
  private isInWaitingList = false

  async getIsInWaitingList(): Promise<boolean> {
    return this.isInWaitingList
  }

  async toggleWaitingList(kvkkApproved: boolean): Promise<boolean> {
    if (!kvkkApproved) {
      throw new Error('KVKK approval is required.')
    }

    this.isInWaitingList = true
    return true
  }
}

/**
 * ============================
 * Supabase Implementation
 * ============================
 * Information Expert
 */
export class SupabaseWaitingListRepository
  implements WaitingListRepositoryPort {
  async getIsInWaitingList(): Promise<boolean> {
    const { data, error } = await supabase.rpc(
      'fn_lensers_get_is_in_waitinglist'
    )

    if (error) throw error
    return Boolean(data)
  }

  async toggleWaitingList(kvkkApproved: boolean): Promise<boolean> {
    const { error } = await supabase.rpc(
      'fn_lensers_toggle_waitinglist',
      { p_kvkk_approved: kvkkApproved }
    )

    if (error) {
      switch (error.message) {
        case 'kvkk_not_approved':
          throw new Error('KVKK approval is required.')
        case 'not_authenticated':
          throw new Error('You must be logged in.')
        case 'not_a_lenser':
          throw new Error('Only lensers can join the waiting list.')
        default:
          throw new Error(error.message)
      }
    }

    return true
  }
}
