export interface Notification {
  id: string
  type: 'mention' | 'reaction' | 'comment' | 'system'
  title: string
  description?: string
  actor?: {
    name: string
    avatarUrl?: string
  }
  isRead: boolean
  createdAt: string
  link?: string
}

export interface NotificationStats {
  unreadCount: number
}
