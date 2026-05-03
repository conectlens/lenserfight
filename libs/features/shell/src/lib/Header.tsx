import { useAuth } from '@lenserfight/features/auth'
import { useLenser, useLenserWorkspace, useWorkspaceSwitchController } from '@lenserfight/features/profile'
import { ShareModal, useShareContext } from '@lenserfight/features/share'
import { ActionMenu, Breadcrumbs, Button } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/providers'
import { Bot, ChevronLeft, Menu, Share2, Shield, LogOut } from 'lucide-react'
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
              className="!py-1 !px-2.5 !text-xs !rounded-[8px]"
            >
              {!isSwitching && <ChevronLeft size={11} className="-ml-0.5" />}
              @{humanWorkspace.handle}
            </Button>
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
