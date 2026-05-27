import { useMutation } from '@tanstack/react-query'
import { tagFollowsService } from '@lenserfight/data/repositories'
import type { ContentReportDTO } from '@lenserfight/types'

export const useReportContent = () => {
  return useMutation({
    mutationFn: (dto: ContentReportDTO) => tagFollowsService.reportContent(dto),
  })
}
