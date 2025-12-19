import { supabase } from '../utils/supabase'

export interface WaitingListRepositoryPort {
  toggleWaitingList(kvkkApproved: boolean): Promise<void>
}
export class MockWaitingListRepository implements WaitingListRepositoryPort {
  toggleWaitingList(kvkkApproved: boolean): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

export class SupabaseWaitingListRepository implements WaitingListRepositoryPort {
  async toggleWaitingList(kvkkApproved: boolean): Promise<void> {
    const { error } = await supabase.rpc('fn_lensers_toggle_waitinglist', {
      p_kvkk_approved: kvkkApproved,
    })

    if (error) {
      // Normalize Postgres error codes/messages
      switch (error.message) {
        case 'kvkk_not_approved':
          throw new Error('KVKK approval is required.')

        case 'not_authenticated':
          throw new Error('You must be logged in.')

        case 'not_a_lenser':
          throw new Error('Only lensers can join the waiting list.')

        default:
          // Fallback for unexpected Postgres messages
          throw new Error(`Unexpected error: ${error.message}`)
      }
    }
  }
}
