import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import React from 'react'

interface OwnerRecoveryBannerProps {
  handle: string
  status: string
  deletionDeadline?: string | null
}

export const OwnerRecoveryBanner: React.FC<OwnerRecoveryBannerProps> = ({
  handle,
  status,
  deletionDeadline,
}) => {
  const queryClient = useQueryClient()

  const cancelMutation = useMutation({
    mutationFn: () => lenserService.cancelDeletionOnLogin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lenser.profile(handle) })
      queryClient.invalidateQueries({ queryKey: queryKeys.lenser.authenticated() })
    },
  })

  const isPendingDeletion = status === 'pending_deletion'
  const isDeactivated = status === 'deactivated'

  const deadlineDate = deletionDeadline ? new Date(deletionDeadline) : null
  const daysRemaining = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="mx-4 md:mx-0 mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 md:p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-200">
            {isPendingDeletion ? 'Account Scheduled for Deletion' : 'Account Deactivated'}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            {isPendingDeletion && daysRemaining !== null
              ? `Your account will be permanently deleted in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}. Your profile is hidden from other users.`
              : isDeactivated
                ? 'Your account is currently deactivated. Your profile is hidden from other users.'
                : 'Your account requires attention.'}
          </p>
          <div className="mt-3 flex gap-3">
            <Button
              className="!w-auto px-4 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => cancelMutation.mutate()}
              isLoading={cancelMutation.isPending}
            >
              {isPendingDeletion ? 'Cancel Deletion' : 'Reactivate Account'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
