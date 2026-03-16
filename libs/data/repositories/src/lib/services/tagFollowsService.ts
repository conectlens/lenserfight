import { SupabaseTagFollowsRepository } from '../repositories/tagFollowsRepository'
import { TagFollowRecord, ContentReportDTO } from '@lenserfight/types'

const tagFollowsRepo = new SupabaseTagFollowsRepository()

export const tagFollowsService = {
  followTag: async (tagId: string): Promise<{ following: boolean }> => {
    return tagFollowsRepo.followTag(tagId)
  },

  unfollowTag: async (tagId: string): Promise<{ following: boolean }> => {
    return tagFollowsRepo.unfollowTag(tagId)
  },

  getFollowedTags: async (lenserId: string): Promise<TagFollowRecord[]> => {
    return tagFollowsRepo.getFollowedTags(lenserId)
  },

  reportContent: async (dto: ContentReportDTO): Promise<{ reported: boolean }> => {
    return tagFollowsRepo.reportContent(dto)
  },
}
