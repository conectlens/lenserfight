import React from 'react'
import { ProfileCompletionCard } from '../onboarding/ProfileCompletionCard'

/**
 * Backward-compatible wrapper. All call sites pass the same props as before.
 * Internally delegates to the new ProfileCompletionCard system.
 */
export interface ProfileCompletionBannerProps {
  score: number
  bio?: string | null
  avatarUrl?: string | null
  location?: string | null
  websiteUrl?: string | null
  bannerUrl?: string | null
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  bio, avatarUrl, location, websiteUrl, bannerUrl,
}) => (
  <ProfileCompletionCard
    bio={bio}
    avatarUrl={avatarUrl}
    location={location}
    websiteUrl={websiteUrl}
    bannerUrl={bannerUrl}
    variant="compact-inline"
    hideAbove={80}
  />
)
