import { SupabaseAdminRepository } from '../repositories/adminRepository'

const repo = new SupabaseAdminRepository()

export const adminService = {
  getDashboardStats: async () => {
    // 30 day lookback
    return repo.getAnalytics(30)
  },

  getUsers: async (page = 1, limit = 20, search = '') => {
    return repo.getUsers((page - 1) * limit, limit, search)
  },

  getFeedbacks: async (page = 1, limit = 20, status = 'all') => {
    return repo.getFeedbacks((page - 1) * limit, limit, status)
  },

  getWaitlist: async (page = 1, limit = 20) => {
    return repo.getWaitlist((page - 1) * limit, limit)
  },

  getContacts: async (page = 1, limit = 20) => {
    return repo.getContacts((page - 1) * limit, limit)
  },
}
