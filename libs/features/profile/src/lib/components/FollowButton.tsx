import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useToast } from '@lenserfight/shared/error'
import { RelationshipState } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

type FollowButtonState = 'follow' | 'requested' | 'following' | 'follow_back' | 'unavailable'

interface FollowButtonProps {
  targetProfileId: string
  handle: string
  relationshipState: RelationshipState | null
  onStateChange?: () => void
}

function resolveButtonState(rel: RelationshipState | null): FollowButtonState {
  if (!rel) return 'follow'
  if (rel.is_blocked) return 'unavailable'
  if (rel.viewer_to_subject === 'accepted') return 'following'
  if (rel.viewer_to_subject === 'pending') return 'requested'
  if (rel.subject_to_viewer === 'accepted') return 'follow_back'
  return 'follow'
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  targetProfileId,
  handle,
  relationshipState,
  onStateChange,
}) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { toastError } = useToast()
  const { user } = useAuth()
  const [showUnfollow, setShowUnfollow] = useState(false)
  const buttonState = resolveButtonState(relationshipState)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.lenser.profile(handle) })
    onStateChange?.()
  }

  const followMutation = useMutation({
    mutationFn: () => lenserService.requestFollow(targetProfileId),
    onSuccess: invalidate,
    onError: (err) => toastError(err, { redirectOnAuth: true, navigate }),
  })

  const unfollowMutation = useMutation({
    mutationFn: () => lenserService.removeFollow(targetProfileId),
    onSuccess: invalidate,
    onError: (err) => toastError(err, { redirectOnAuth: true, navigate }),
  })

  const isLoading = followMutation.isPending || unfollowMutation.isPending

  if (buttonState === 'unavailable') return null

  if (!user) {
    return (
      <Button
        aria-label="Sign in to follow"
        className="!w-auto px-4 py-2 text-sm"
        onClick={() => navigate('/auth/login')}
      >
        <UserPlus size={16} className="mr-1.5" />
        Sign in to follow
      </Button>
    )
  }

  if (buttonState === 'following') {
    return (
      <Button
        variant={showUnfollow ? 'danger' : 'secondary'}
        aria-label={showUnfollow ? `Unfollow @${handle}` : `Following @${handle}`}
        className="!w-auto px-4 py-2 text-sm"
        onMouseEnter={() => setShowUnfollow(true)}
        onMouseLeave={() => setShowUnfollow(false)}
        onClick={() => unfollowMutation.mutate()}
        isLoading={isLoading}
      >
        {showUnfollow ? (
          <>
            <UserX size={16} className="mr-1.5" />
            Unfollow
          </>
        ) : (
          <>
            <UserCheck size={16} className="mr-1.5" />
            Following
          </>
        )}
      </Button>
    )
  }

  if (buttonState === 'requested') {
    return (
      <Button
        variant="secondary"
        className="!w-auto px-4 py-2 text-sm"

        onClick={() => unfollowMutation.mutate()}
        isLoading={isLoading}
      >
        <Clock size={16} className="mr-1.5" />
        Requested
      </Button>
    )
  }

  return (
    <Button
      className="!w-auto px-4 py-2 text-sm bg-primary hover:bg-yellow-400"
      onClick={() => followMutation.mutate()}
      isLoading={isLoading}
    >
      <UserPlus size={16} className="mr-1.5" />
      {buttonState === 'follow_back' ? 'Follow Back' : 'Follow'}
    </Button>
  )
}
