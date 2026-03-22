import { SupabaseAdminRepository } from '../repositories/adminRepository'
import { AdminListResponse } from '@lenserfight/types'
import { ApiResponseEnvelope } from 'contracts'

const repo = new SupabaseAdminRepository()

function toAdminList<T>(envelope: ApiResponseEnvelope<T[]>): AdminListResponse<T> {
  return { data: envelope.data ?? [], total: envelope.meta?.total ?? 0 }
}

export const adminService = {
  getDashboardStats: async () => {
    // 30 day lookback
    return repo.getAnalytics(30)
  },

  getUsers: async (page = 1, limit = 20, search = '') => {
    return toAdminList(await repo.getUsers((page - 1) * limit, limit, search))
  },

  getFeedbacks: async (page = 1, limit = 20, status = 'all') => {
    return toAdminList(await repo.getFeedbacks((page - 1) * limit, limit, status))
  },

  getWaitlist: async (page = 1, limit = 20) => {
    return toAdminList(await repo.getWaitlist((page - 1) * limit, limit))
  },

  getContacts: async (page = 1, limit = 20) => {
    return toAdminList(await repo.getContacts((page - 1) * limit, limit))
  },
}
