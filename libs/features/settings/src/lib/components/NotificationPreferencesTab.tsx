import { notificationsRepository } from '@lenserfight/data/repositories'
import type { NotificationPreference, NotificationType } from '@lenserfight/types'
import { NOTIFICATION_CATEGORY_MAP } from '@lenserfight/types'
import { Switch } from '@lenserfight/ui/forms'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import React from 'react'

type Category = 'battle' | 'social' | 'content' | 'agent' | 'system'

const CATEGORY_LABELS: Record<Category, string> = {
  battle:  'Battle',
  social:  'Social',
  content: 'Content',
  agent:   'Agent',
  system:  'System',
}

const TYPE_LABELS: Partial<Record<NotificationType, { label: string; description: string }>> = {
  // Battle
  battle_result:             { label: 'Battle results',          description: 'When a battle you participated in finishes' },
  battle_started:            { label: 'Battle started',          description: 'When a battle you joined goes live' },
  battle_joined:             { label: 'New challenger joined',   description: 'When someone joins your battle' },
  battle_won:                { label: 'Battle won',              description: 'When you win a battle' },
  battle_lost:               { label: 'Battle lost',             description: 'When a battle you competed in ends without a win' },
  battle_comment:            { label: 'Battle comments',         description: 'When someone comments on your battle' },
  vote_received:             { label: 'Votes received',          description: 'When someone votes on your battle entry' },
  vote_reminder:             { label: 'Vote reminders',          description: 'Reminders to vote before a battle closes' },
  template_battle_open:      { label: 'Template battles open',   description: 'When a new template battle opens for submissions' },
  template_battle_published: { label: 'Template battles published', description: 'When a template battle you entered is published' },
  // Social
  follow_new:                { label: 'New followers',           description: 'When someone follows your profile' },
  follow_request:            { label: 'Follow requests',         description: 'When someone requests to follow your private profile' },
  follow_accepted:           { label: 'Follow accepted',         description: 'When your follow request is approved' },
  // Content
  lens_comment:              { label: 'Lens comments',           description: 'When someone comments on your lens' },
  lens_published:            { label: 'Lens published',          description: 'When someone you follow publishes a lens' },
  lens_forked:               { label: 'Lens forked',             description: 'When someone forks your lens' },
  lens_featured:             { label: 'Lens featured',           description: 'When your lens is featured by the team' },
  lens_milestone:            { label: 'Lens milestones',         description: 'When your lens reaches a copy or reaction milestone' },
  workflow_published:        { label: 'Workflow published',      description: 'When someone you follow publishes a workflow' },
  workflow_forked:           { label: 'Workflow forked',         description: 'When someone forks your workflow' },
  // Agent
  agent_created:             { label: 'Agent created',           description: 'When your AI agent is created and ready' },
  agent_battle_won:          { label: 'Agent battle won',        description: 'When your AI agent wins a battle' },
  agent_critical:            { label: 'Agent critical errors',   description: 'When your AI agent encounters a critical failure' },
  team_run_completed:        { label: 'Team run completed',       description: 'When a team run your agent participates in finishes' },
  team_run_failed:           { label: 'Team run failed',         description: 'When a team run fails' },
  cron_run_completed:        { label: 'Cron run completed',      description: 'When a scheduled workflow run completes' },
  cron_run_failed:           { label: 'Cron run failed',         description: 'When a scheduled workflow run fails' },
  policy_updated:            { label: 'Policy updates',          description: 'When your agent\'s policy is updated' },
  // System
  badge_awarded:             { label: 'Badges awarded',          description: 'When you earn a new badge' },
  leaderboard_change:        { label: 'Leaderboard changes',     description: 'When your leaderboard rank changes significantly' },
}

const CATEGORY_ORDER: Category[] = ['battle', 'social', 'content', 'agent', 'system']

function groupByCategory(): Record<Category, NotificationType[]> {
  const groups = {} as Record<Category, NotificationType[]>
  for (const cat of CATEGORY_ORDER) groups[cat] = []

  for (const [type, cat] of Object.entries(NOTIFICATION_CATEGORY_MAP) as [NotificationType, Category][]) {
    if (TYPE_LABELS[type]) groups[cat].push(type)
  }
  return groups
}

const GROUPED = groupByCategory()

const QUERY_KEY = ['notification-preferences'] as const

export const NotificationPreferencesTab: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: prefs = [], isLoading } = useQuery<NotificationPreference[]>({
    queryKey: QUERY_KEY,
    queryFn:  () => notificationsRepository.getPreferences(),
    staleTime: 1000 * 60 * 5,
  })

  const prefMap = React.useMemo(
    () => new Map(prefs.map((p) => [p.notification_type, p.enabled])),
    [prefs]
  )

  const isEnabled = (type: NotificationType) => prefMap.get(type) ?? true

  const handleToggle = async (type: NotificationType, enabled: boolean) => {
    // Optimistic update
    queryClient.setQueryData<NotificationPreference[]>(QUERY_KEY, (old = []) => {
      const existing = old.find((p) => p.notification_type === type)
      if (existing) {
        return old.map((p) => p.notification_type === type ? { ...p, enabled } : p)
      }
      return [...old, { notification_type: type, enabled, updated_at: new Date().toISOString() }]
    })

    try {
      await notificationsRepository.upsertPreference(type, enabled)
    } catch {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-14 bg-gray-50 dark:bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose which events send you a notification. Changes apply immediately.
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const types = GROUPED[cat]
        if (types.length === 0) return null

        return (
          <div key={cat}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              {CATEGORY_LABELS[cat]}
            </h3>
            <div className="space-y-1">
              {types.map((type) => {
                const meta = TYPE_LABELS[type]!
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {meta.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {meta.description}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled(type)}
                      onChange={(v) => handleToggle(type, v)}
                      size="sm"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
