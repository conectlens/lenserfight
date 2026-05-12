import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

interface ProfileCompletionBannerProps {
  score: number
  bio?: string | null
  avatarUrl?: string | null
  location?: string | null
  websiteUrl?: string | null
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  bio: 'Add a bio',
  avatar: 'Upload an avatar',
  location: 'Add your location',
  website: 'Add your website',
}

export const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({
  score,
  bio,
  avatarUrl,
  location,
  websiteUrl,
}) => {
  if (score >= 80) return null

  const missingFields: string[] = []
  if (!bio?.trim()) missingFields.push('bio')
  if (!avatarUrl?.trim()) missingFields.push('avatar')
  if (!location?.trim()) missingFields.push('location')
  if (!websiteUrl?.trim()) missingFields.push('website')

  return (
    <div className="mx-4 mb-4 md:mx-0 rounded-2xl border border-primary-yellow-500/30 bg-primary-yellow-500/5 px-5 py-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary-yellow-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
          Complete your profile to unlock XP bonuses
        </p>
        <span className="ml-auto text-xs font-semibold text-primary-yellow-600">{score}%</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-greyscale-200 dark:bg-greyscale-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-yellow-500 transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>

      {missingFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {missingFields.map((field) => (
            <Link
              key={field}
              to="/account/settings"
              className="inline-flex items-center rounded-full border border-primary-yellow-500/40 bg-primary-yellow-500/10 px-3 py-1 text-xs font-medium text-primary-yellow-700 dark:text-primary-yellow-400 hover:bg-primary-yellow-500/20 transition-colors"
            >
              + {MISSING_FIELD_LABELS[field]}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
