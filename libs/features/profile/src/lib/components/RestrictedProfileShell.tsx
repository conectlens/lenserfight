import React from 'react'
import { Lock } from 'lucide-react'
import { Avatar } from '@lenserfight/ui/components'
import { LenserProfileDTO, RelationshipState } from '@lenserfight/types'
import { formatCount } from '@lenserfight/utils/number'
import { FollowButton } from './FollowButton'

interface RestrictedProfileShellProps {
  profile: LenserProfileDTO
  relationshipState: RelationshipState | null
  isAuthenticated: boolean
}

export const RestrictedProfileShell: React.FC<RestrictedProfileShellProps> = ({
  profile,
  relationshipState,
  isAuthenticated,
}) => {
  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="relative mb-6 md:mb-8">
        {/* Banner placeholder */}
        <div className="h-32 md:h-64 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative z-0">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <span className="text-gray-400 dark:text-gray-600 opacity-50 text-4xl md:text-6xl font-black tracking-tighter mix-blend-overlay">
              LENSER
            </span>
          </div>
        </div>

        {/* Profile card */}
        <div className="px-0 md:px-6 relative z-10 -mt-6 md:-mt-16">
          <div className="bg-white dark:bg-gray-800 md:rounded-2xl shadow-sm border-b md:border border-gray-100 dark:border-gray-700 p-6 md:p-8">
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="-mt-16 md:-mt-20 mb-4">
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="!w-28 !h-28 md:!w-40 md:!h-40 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-white dark:bg-gray-700"
                />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {profile.display_name}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-1">
                @{profile.handle}
              </p>

              {/* Stats row */}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCount(profile.follower_count ?? 0)}
                  </span>{' '}
                  Followers
                </div>
                <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                <div>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCount(profile.following_count ?? 0)}
                  </span>{' '}
                  Following
                </div>
              </div>

              {/* Follow button */}
              {isAuthenticated && (
                <div className="mt-6">
                  <FollowButton
                    targetProfileId={profile.id}
                    handle={profile.handle}
                    relationshipState={relationshipState}
                  />
                </div>
              )}

              {/* Private notice */}
              <div className="mt-8 flex flex-col items-center gap-3 py-8 px-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 border-dashed w-full max-w-md">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <Lock size={24} />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                  This account is private
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Follow this account to see their posts, threads, and prompts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
