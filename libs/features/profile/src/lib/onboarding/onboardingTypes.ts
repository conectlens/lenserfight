export type OnboardingCategory =
  | 'identity'
  | 'content'
  | 'social'
  | 'battle'
  | 'creator'
  | 'agent'

export type OnboardingTaskId =
  | 'add_avatar'
  | 'add_bio'
  | 'add_location'
  | 'add_website'
  | 'add_banner'
  | 'create_lens'
  | 'publish_workflow'
  | 'join_battle'
  | 'follow_creator'
  | 'invite_friend'
  | 'verify_agent'
  | 'connect_github'

export interface OnboardingTask {
  id: OnboardingTaskId
  category: OnboardingCategory
  label: string
  description: string
  xp: number
  weight: number
  required: boolean
  completed: boolean
  href: string
  iconName: string
}

export interface OnboardingCategory_ {
  id: OnboardingCategory
  label: string
  tasks: OnboardingTask[]
}

export interface OnboardingState {
  score: number
  totalXp: number
  earnedXp: number
  tasks: OnboardingTask[]
  dismissedAt: number | null
  completedAt: number | null
}

export type OnboardingVariant =
  | 'compact-inline'
  | 'sticky-banner'
  | 'floating-assistant'
  | 'checklist-panel'
  | 'xp-card'
  | 'empty-state'
  | 'bottom-sheet'
