import { TagFollowRecord, ContentReportDTO } from '@lenserfight/types'
import { createTagFollowsRepository } from '../factory'


const tagFollowsRepo = createTagFollowsRepository()

export const tagFollowsService = {
  followTag: async (tagId: string): Promise<{ following: boolean }> => {
    return tagFollowsRepo.followTag(tagId)
  },

  unfollowTag: async (tagId: string): Promise<{ following: boolean }> => {
    return tagFollowsRepo.unfollowTag(tagId)
  },

  getFollowedTags: async (lenserId: string, limit = 50): Promise<TagFollowRecord[]> => {
    return tagFollowsRepo.getFollowedTags(lenserId, limit)
  },

  reportContent: async (dto: ContentReportDTO): Promise<{ reported: boolean }> => {
    return tagFollowsRepo.reportContent(dto)
  },
}
