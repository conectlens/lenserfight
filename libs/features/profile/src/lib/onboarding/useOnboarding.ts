import { useCallback, useMemo, useState } from 'react'
import {
  ONBOARDING_TASKS,
  computeEarnedXp,
  computeOnboardingScore,
  computeTotalXp,
  getNextSuggestedTask,
} from './onboardingTasks'
import type { OnboardingState, OnboardingTask } from './onboardingTypes'

const DISMISS_KEY = 'lf_onboarding_dismissed_at'
const DISMISS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

function readDismissedAt(): number | null {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return raw ? parseInt(raw, 10) : null
  } catch {
    return null
  }
}

function writeDismissedAt(ts: number | null) {
  try {
    if (ts === null) localStorage.removeItem(DISMISS_KEY)
    else localStorage.setItem(DISMISS_KEY, String(ts))
  } catch {}
}

export interface UseOnboardingInput {
  bio?: string | null
  avatarUrl?: string | null
  location?: string | null
  websiteUrl?: string | null
  bannerUrl?: string | null
  hasLens?: boolean
  hasWorkflow?: boolean
  hasJoinedBattle?: boolean
  hasFollowed?: boolean
  hasInvited?: boolean
  hasVerifiedAgent?: boolean
  hasGithub?: boolean
}

export function useOnboarding(input: UseOnboardingInput) {
  const [dismissedAt, setDismissedAt] = useState<number | null>(readDismissedAt)

  const tasks = useMemo<OnboardingTask[]>(() => {
    return ONBOARDING_TASKS.map((t) => {
      switch (t.id) {
        case 'add_avatar':     return { ...t, completed: !!input.avatarUrl?.trim() }
        case 'add_bio':        return { ...t, completed: !!input.bio?.trim() }
        case 'add_location':   return { ...t, completed: !!input.location?.trim() }
        case 'add_website':    return { ...t, completed: !!input.websiteUrl?.trim() }
        case 'add_banner':     return { ...t, completed: !!input.bannerUrl?.trim() }
        case 'create_lens':    return { ...t, completed: !!input.hasLens }
        case 'publish_workflow': return { ...t, completed: !!input.hasWorkflow }
        case 'join_battle':    return { ...t, completed: !!input.hasJoinedBattle }
        case 'follow_creator': return { ...t, completed: !!input.hasFollowed }
        case 'invite_friend':  return { ...t, completed: !!input.hasInvited }
        case 'verify_agent':   return { ...t, completed: !!input.hasVerifiedAgent }
        case 'connect_github': return { ...t, completed: !!input.hasGithub }
        default:               return t
      }
    })
  }, [input])

  const score     = useMemo(() => computeOnboardingScore(tasks), [tasks])
  const earnedXp  = useMemo(() => computeEarnedXp(tasks), [tasks])
  const totalXp   = useMemo(() => computeTotalXp(tasks), [tasks])
  const nextTask  = useMemo(() => getNextSuggestedTask(tasks), [tasks])

  const state: OnboardingState = useMemo(
    () => ({
      score,
      totalXp,
      earnedXp,
      tasks,
      dismissedAt,
      completedAt: score >= 100 ? Date.now() : null,
    }),
    [score, totalXp, earnedXp, tasks, dismissedAt],
  )

  const isDismissed = useCallback(() => {
    if (dismissedAt === null) return false
    return Date.now() - dismissedAt < DISMISS_COOLDOWN_MS
  }, [dismissedAt])

  const dismiss = useCallback(() => {
    const ts = Date.now()
    writeDismissedAt(ts)
    setDismissedAt(ts)
  }, [])

  const resetDismissal = useCallback(() => {
    writeDismissedAt(null)
    setDismissedAt(null)
  }, [])

  const shouldShow = score < 100 && !isDismissed()

  return { state, tasks, score, earnedXp, totalXp, nextTask, shouldShow, dismiss, resetDismissal }
}
