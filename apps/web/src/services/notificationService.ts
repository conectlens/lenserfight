import { Notification } from '../types/notification.types'

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-1',
    type: 'mention',
    title: 'John Doe mentioned you in a thread',
    description: 'Project Alpha',
    actor: {
      name: 'John Doe',
      avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
    link: '/app',
  },
  {
    id: 'n-2',
    type: 'reaction',
    title: "Your prompt 'Daily Reflection' received a new reaction",
    description: 'From Jane Smith',
    actor: {
      name: 'Jane Smith',
      avatarUrl: 'https://ui-avatars.com/api/?name=Jane+Smith&background=random',
    },
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8h ago
    link: '/app',
  },
  {
    id: 'n-3',
    type: 'comment',
    title: 'Alice Johnson commented on your submission',
    description: "Challenge: 'Monochrome World'",
    actor: {
      name: 'Alice Johnson',
      avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=random',
    },
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1d ago
    link: '/app',
  },
  {
    id: 'n-4',
    type: 'system',
    title: "Your submission for 'Urban Exploration' was accepted",
    description: 'Weekly Challenge',
    actor: {
      name: 'LenserFight',
      avatarUrl: 'https://ui-avatars.com/api/?name=LenserFight&background=ffde59&color=000',
    },
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3d ago
    link: '/app',
  },
]

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 300))
    return MOCK_NOTIFICATIONS
  },

  getUnreadCount: async (): Promise<number> => {
    return MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length
  },

  markAsRead: async (id: string): Promise<void> => {
    const note = MOCK_NOTIFICATIONS.find((n) => n.id === id)
    if (note) note.isRead = true
  },

  markAllAsRead: async (): Promise<void> => {
    MOCK_NOTIFICATIONS.forEach((n) => (n.isRead = true))
  },
}
