import type { OnboardingTask } from './onboardingTypes'

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: 'add_avatar',
    category: 'identity',
    label: 'Upload a photo',
    description: 'Put a face to your name and build trust.',
    xp: 20,
    weight: 20,
    required: true,
    completed: false,
    href: '/settings/profile',
    iconName: 'UserCircle',
  },
  {
    id: 'add_bio',
    category: 'identity',
    label: 'Write a bio',
    description: 'Tell the community who you are.',
    xp: 15,
    weight: 15,
    required: true,
    completed: false,
    href: '/settings/profile',
    iconName: 'FileText',
  },
  {
    id: 'add_location',
    category: 'identity',
    label: 'Add your location',
    description: 'Help others discover you locally.',
    xp: 5,
    weight: 5,
    required: false,
    completed: false,
    href: '/settings/profile',
    iconName: 'MapPin',
  },
  {
    id: 'add_website',
    category: 'identity',
    label: 'Link your website',
    description: 'Share your portfolio or project.',
    xp: 5,
    weight: 5,
    required: false,
    completed: false,
    href: '/settings/profile',
    iconName: 'Globe',
  },
  {
    id: 'add_banner',
    category: 'identity',
    label: 'Set a banner image',
    description: 'Make your profile stand out.',
    xp: 10,
    weight: 10,
    required: false,
    completed: false,
    href: '/settings/profile',
    iconName: 'Image',
  },
  {
    id: 'create_lens',
    category: 'content',
    label: 'Create your first lens',
    description: 'Publish a prompt or workflow to the arena.',
    xp: 30,
    weight: 20,
    required: true,
    completed: false,
    href: '/lenses',
    iconName: 'Zap',
  },
  {
    id: 'publish_workflow',
    category: 'content',
    label: 'Publish a workflow',
    description: 'Share an automated chain with the community.',
    xp: 25,
    weight: 15,
    required: false,
    completed: false,
    href: '/workflows',
    iconName: 'GitBranch',
  },
  {
    id: 'join_battle',
    category: 'battle',
    label: 'Enter a battle',
    description: 'Test your prompts against others.',
    xp: 40,
    weight: 20,
    required: false,
    completed: false,
    href: '/battles',
    iconName: 'Swords',
  },
  {
    id: 'follow_creator',
    category: 'social',
    label: 'Follow a creator',
    description: 'Build your network and discover new ideas.',
    xp: 10,
    weight: 10,
    required: false,
    completed: false,
    href: '/lensers',
    iconName: 'Users',
  },
  {
    id: 'invite_friend',
    category: 'social',
    label: 'Invite a friend',
    description: 'Grow the community and earn bonus XP.',
    xp: 50,
    weight: 10,
    required: false,
    completed: false,
    href: '/lensers',
    iconName: 'UserPlus',
  },
  {
    id: 'verify_agent',
    category: 'agent',
    label: 'Verify your agent',
    description: 'Establish trust for your AI lenser.',
    xp: 35,
    weight: 15,
    required: false,
    completed: false,
    href: '/settings/agents',
    iconName: 'ShieldCheck',
  },
  {
    id: 'connect_github',
    category: 'creator',
    label: 'Connect GitHub',
    description: 'Link your code and repos to your profile.',
    xp: 20,
    weight: 10,
    required: false,
    completed: false,
    href: '/settings/connected-accounts',
    iconName: 'Github',
  },
]

export function computeOnboardingScore(tasks: OnboardingTask[]): number {
  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)
  const earnedWeight = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.weight, 0)
  return totalWeight === 0 ? 0 : Math.round((earnedWeight / totalWeight) * 100)
}

export function computeEarnedXp(tasks: OnboardingTask[]): number {
  return tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.xp, 0)
}

export function computeTotalXp(tasks: OnboardingTask[]): number {
  return tasks.reduce((sum, t) => sum + t.xp, 0)
}

export function getNextSuggestedTask(tasks: OnboardingTask[]): OnboardingTask | null {
  const required = tasks.find((t) => !t.completed && t.required)
  if (required) return required
  return tasks.find((t) => !t.completed) ?? null
}

export function groupTasksByCategory(tasks: OnboardingTask[]) {
  const map = new Map<string, OnboardingTask[]>()
  for (const task of tasks) {
    const group = map.get(task.category) ?? []
    group.push(task)
    map.set(task.category, group)
  }
  return map
}
