import { useAuth } from '@lenserfight/features/auth'
import { useUnreadCount } from '@lenserfight/features/notifications'
import { useLenser, useLenserWorkspace, useWorkspaceSwitchController } from '@lenserfight/features/profile'
import { ShareModal, useShareContext } from '@lenserfight/features/share'
import { useWallet } from '@lenserfight/features/store'
import { ActionMenu, Breadcrumbs, Button } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/providers'
import { Bell, ChevronLeft, Menu, Share2, Shield, LogOut, Zap } from 'lucide-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { shareConfig } = useShareContext()
  const { pageActions } = useUI()
  const { lenser } = useLenser()
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const { activeWorkspace, humanWorkspace } = useLenserWorkspace()
  const { switchToProfile, isSwitching } = useWorkspaceSwitchController()

  const isAgentOwner = activeWorkspace?.type === 'ai'
  const { balance, isLoading: walletLoading } = useWallet()
  const unreadCount = useUnreadCount()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm transition-all duration-200 w-full border-b border-gray-200/50 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
          <Breadcrumbs />
        </div>

        <div className="flex items-center flex-shrink-0 pl-2 gap-1">
          {lenser?.is_super_admin && (
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mr-1"
              title="Admin Dashboard"
            >
              <Shield size={20} />
            </button>
          )}

          {shareConfig && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Share"
              title="Share"
            >
              <Share2 size={20} />
            </button>
          )}

          {pageActions.length > 0 && <ActionMenu actions={pageActions} />}

          {isAgentOwner && humanWorkspace && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => switchToProfile(humanWorkspace)}
              disabled={isSwitching}
              isLoading={isSwitching}
            >
              {!isSwitching && <ChevronLeft size={11} className="-ml-0.5" />}
              @{humanWorkspace.handle}
            </Button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {isAuthenticated && balance !== null && (
            <button
              onClick={() => navigate('/billing')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
              title="Wallet balance — click to top up"
            >
              <Zap size={13} className="shrink-0" />
              {walletLoading ? '…' : balance.toLocaleString()}
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors ml-1"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {shareConfig && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={shareConfig.title}
          resourceType={shareConfig.resourceType}
          resourceId={shareConfig.resourceId}
          slug={shareConfig.slug}
        />
      )}
    </header>
  )
}
