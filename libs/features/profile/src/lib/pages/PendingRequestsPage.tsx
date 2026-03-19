import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCheck, UserX, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { lenserService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { PendingFollowRequest } from '@lenserfight/types'
import { timeAgo } from '@lenserfight/utils/date'

export const PendingRequestsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: requests = [], isLoading } = useQuery<PendingFollowRequest[]>({
    queryKey: queryKeys.lenser.pendingRequests(),
    queryFn: () => lenserService.getPendingRequests(),
  })

  const acceptMutation = useMutation({
    mutationFn: (sourceId: string) => lenserService.acceptFollowRequest(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lenser.pendingRequests() })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (sourceId: string) => lenserService.rejectFollowRequest(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lenser.pendingRequests() })
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Follow Requests
      </h1>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed">
          <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-500 shadow-sm border border-gray-100 dark:border-gray-600">
            <Users size={32} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No pending follow requests
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors"
            >
              <div
                className="cursor-pointer flex-shrink-0"
                onClick={() => navigate(`/lenser/${request.handle}`)}
              >
                <Avatar
                  src={request.avatar_url}
                  alt={request.display_name}
                  className="!w-12 !h-12"
                />
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/lenser/${request.handle}`)}
              >
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {request.display_name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{request.handle} &middot; {timeAgo(request.requested_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  className="!w-auto px-3 py-1.5 text-sm bg-primary hover:bg-yellow-400"
                  onClick={() => acceptMutation.mutate(request.source_profile_id)}
                  isLoading={acceptMutation.isPending}
                >
                  <UserCheck size={16} />
                </Button>
                <Button
                  variant="secondary"
                  className="!w-auto px-3 py-1.5 text-sm"
                  onClick={() => rejectMutation.mutate(request.source_profile_id)}
                  isLoading={rejectMutation.isPending}
                >
                  <UserX size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
