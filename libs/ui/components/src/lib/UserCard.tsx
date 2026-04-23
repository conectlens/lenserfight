import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react'

import type { WorkspaceIdentity } from '@lenserfight/types'

import { Avatar } from './Avatar'

export interface UserCardUser {
  id: string
  email?: string
  user_metadata?: {
    display_name?: string
    avatar_url?: string
  }
}

export interface UserCardLenser {
  handle: string
  display_name: string
  avatar_url?: string | null
}

export interface UserCardProps {
  user: UserCardUser | null
  lenser?: UserCardLenser | null
  onLogout: () => Promise<void>
  settingsUrl?: string
  profileUrl?: string
  loginUrl?: string
  variant?: 'compact' | 'expanded'
  className?: string
  workspaces?: WorkspaceIdentity[]
  onSwitchWorkspace?: (lenserProfileId: string) => void
}

function WorkspaceSwitchList({
  workspaces,
  onSelect,
}: {
  workspaces: WorkspaceIdentity[]
  onSelect: (workspaceId: string) => void
}) {
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 py-1">
      <p className="px-4 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
        <ArrowLeftRight size={10} />
        Switch workspace
      </p>
      {workspaces.slice(0, 4).map((workspace) => (
        <button
          key={workspace.id}
          onClick={() => onSelect(workspace.id)}
          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Avatar src={workspace.avatar_url} alt={workspace.display_name} size="sm" />
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate">{workspace.display_name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">@{workspace.handle}</p>
          </div>
          {workspace.type === 'ai' && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
              AI
            </span>
          )}
          {workspace.is_active && (
            <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">
              Active
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  lenser,
  onLogout,
  settingsUrl = '/settings',
  profileUrl,
  loginUrl = '/auth/login',
  variant = 'compact',
  className = '',
  workspaces,
  onSwitchWorkspace,
}) => {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClick)
    }

    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await onLogout()
    } finally {
      setSigningOut(false)
      setOpen(false)
    }
  }

  if (!user) {
    return (
      <a
        href={loginUrl}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white hover:bg-primary-600 transition-colors ${className}`}
      >
        Sign in
      </a>
    )
  }

  const displayName =
    lenser?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Lenser'
  const avatarSrc = lenser?.avatar_url || user.user_metadata?.avatar_url || null
  const handle = lenser?.handle ? `@${lenser.handle}` : null
  const resolvedProfileUrl = profileUrl ?? (lenser?.handle ? `/lenser/${lenser.handle}` : undefined)
  const canSwitchWorkspace = !!workspaces && workspaces.length > 1 && !!onSwitchWorkspace

  if (variant === 'expanded') {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3 ${className}`}
      >
        <div className="flex items-center gap-3">
          <Avatar src={avatarSrc} alt={displayName} size="lg" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {displayName}
            </span>
            {handle && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{handle}</span>
            )}
            {user.email && (
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {user.email}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          {resolvedProfileUrl && (
            <a
              href={resolvedProfileUrl}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <UserIcon size={14} />
              Profile
            </a>
          )}
          <a
            href={settingsUrl}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Settings size={14} />
            Settings
          </a>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 ml-auto disabled:opacity-50"
          >
            <LogOut size={14} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        {canSwitchWorkspace && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <WorkspaceSwitchList
              workspaces={workspaces}
              onSelect={(workspaceId) => onSwitchWorkspace(workspaceId)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar src={avatarSrc} alt={displayName} size="sm" />
        <span className="hidden sm:block text-sm font-semibold text-gray-800 dark:text-gray-200 max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
            {handle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{handle}</p>
            )}
            {user.email && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
            )}
          </div>

          <div className="py-1">
            {resolvedProfileUrl && (
              <a
                href={resolvedProfileUrl}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <UserIcon size={15} className="text-gray-400" />
                View profile
              </a>
            )}
            <a
              href={settingsUrl}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings size={15} className="text-gray-400" />
              Settings
            </a>
          </div>

          {canSwitchWorkspace && (
            <WorkspaceSwitchList
              workspaces={workspaces}
              onSelect={(workspaceId) => {
                onSwitchWorkspace(workspaceId)
                setOpen(false)
              }}
            />
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 py-1">
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <LogOut size={15} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
