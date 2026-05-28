import React, { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotifications } from './hooks/useNotifications'
import type { NotificationRecord } from '@lenserfight/data/repositories'

function NotificationItem({ notification, onRead }: { notification: NotificationRecord; onRead: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-4 py-3 hover:bg-surface-raised transition-colors border-b border-surface-border last:border-0 ${
        notification.read_at ? 'opacity-60' : ''
      }`}
      onClick={() => {
        onRead(notification.id)
        if (notification.action_url) {
          window.location.href = notification.action_url
        }
      }}
    >
      <div className="flex items-start gap-3">
        {!notification.read_at && (
          <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-yellow-500" />
        )}
        <div className={`flex-1 min-w-0 ${notification.read_at ? 'pl-5' : ''}`}>
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 truncate">
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-greyscale-500 mt-0.5 truncate">{notification.body}</p>
          )}
          <p className="text-xs text-greyscale-400 mt-1">
            {new Date(notification.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications(15)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-raised transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-greyscale-600 dark:text-greyscale-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-yellow-500 text-[10px] font-bold text-black leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.1 } }}
            className="absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-surface-border bg-surface shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs text-primary-yellow-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <div className="px-4 py-8 text-center text-sm text-greyscale-400">
                  Loading…
                </div>
              )}
              {!isLoading && notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-greyscale-400">
                  No notifications yet.
                </div>
              )}
              {!isLoading && notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={(id) => markRead([id])}
                />
              ))}
            </div>

            <div className="border-t border-surface-border px-4 py-2.5">
              <a
                href="/notifications"
                className="text-xs text-primary-yellow-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { useNotifications } from './hooks/useNotifications'
export { useNotificationToast } from './hooks/useNotificationToast'

export default NotificationBell
