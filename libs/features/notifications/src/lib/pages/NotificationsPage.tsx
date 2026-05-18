import React, { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button, HelpButton } from '@lenserfight/ui/components'
import { useNotifications } from '../hooks/useNotifications'
import { useUnreadCount } from '../hooks/useUnreadCount'
import type { NotificationRecord } from '@lenserfight/data/repositories'
import { NOTIFICATION_CATEGORY_MAP, type NotificationType, type NotificationCategory } from '@lenserfight/types'

type FilterTab = 'all' | 'unread' | NotificationCategory

function NotificationRow({ n, onRead }: { n: NotificationRecord; onRead: (id: string) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`flex items-start gap-4 px-5 py-4 border-b border-surface-border cursor-pointer hover:bg-surface-raised transition-colors ${n.read_at ? 'opacity-60' : ''
        }`}
      onClick={() => {
        onRead(n.id)
        if (n.action_url) window.location.href = n.action_url
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onRead(n.id)
          if (n.action_url) window.location.href = n.action_url
        }
      }}
    >
      <div className="mt-1 flex-shrink-0">
        {!n.read_at ? (
          <span className="h-2 w-2 rounded-full bg-primary-yellow-500 block" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-transparent block" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{n.title}</p>
        {n.body && <p className="text-sm text-greyscale-500 mt-0.5">{n.body}</p>}
        <p className="text-xs text-greyscale-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
      </div>
      <span className="flex-shrink-0 text-xs text-greyscale-400 capitalize mt-0.5">
        {n.type.replace(/_/g, ' ')}
      </span>
    </div>
  )
}

export function NotificationsPage() {
  const [tab, setTab] = useState<FilterTab>('all')
  const [page, setPage] = useState(1)
  const { notifications, isLoading, markRead, markAllRead } = useNotifications(50)
  const unreadCount = useUnreadCount()

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read_at
    if (tab === 'all') return true
    return NOTIFICATION_CATEGORY_MAP[n.type as NotificationType] === (tab as NotificationCategory)
  })

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'battle', label: 'Battles' },
    { id: 'social', label: 'Social' },
    { id: 'content', label: 'Content' },
    { id: 'agent', label: 'Agent' },
    { id: 'system', label: 'System' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-primary-yellow-500" />
          <h1 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-50">Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton path="/explanation/community/notifications" label="About Notifications" />
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="flex items-center gap-2"
            >
              <CheckCheck size={14} />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-surface-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setPage(1) }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${tab === t.id
                ? 'border-primary-yellow-500 text-greyscale-900 dark:text-greyscale-50'
                : 'border-transparent text-greyscale-500 hover:text-greyscale-700 dark:hover:text-greyscale-300'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="rounded-2xl border border-surface-border overflow-hidden">
        {isLoading && (
          <div className="px-5 py-12 text-center text-sm text-greyscale-400">Loading…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="px-5 py-12 text-center">
            <Bell size={32} className="mx-auto mb-3 text-greyscale-300 dark:text-greyscale-600" />
            <p className="text-sm text-greyscale-400">No notifications here yet.</p>
          </div>
        )}
        {!isLoading && filtered.slice(0, page * 20).map((n) => (
          <NotificationRow key={n.id} n={n} onRead={(id) => markRead([id])} />
        ))}
        {filtered.length > page * 20 && (
          <div className="px-5 py-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => setPage((p) => p + 1)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
