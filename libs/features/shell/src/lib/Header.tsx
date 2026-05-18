import { useAuth } from '@lenserfight/features/auth'
import { useUnreadCount } from '@lenserfight/features/notifications'
import { useLenser, useLenserWorkspace, useWorkspaceSwitchController } from '@lenserfight/features/profile'
import { ShareModal, useShareContext } from '@lenserfight/features/share'
import { useChainabitConnection } from '@lenserfight/features/store'
import { ChainabitModal } from '@lenserfight/ui/modals'
import { ActionMenu, Breadcrumbs, Button } from '@lenserfight/ui/components'
import { useUI } from '@lenserfight/ui/providers'
import { CHAINABIT_APP_URL } from '@lenserfight/utils/env'
import { partnerApiClient } from '@lenserfight/infra/partner-provisioning'
import { useLocale } from '@lenserfight/shared/i18n-locale'
import { LocaleLanguageSelect } from '@lenserfight/ui/forms'
import { Bell, ChevronLeft, Menu, Share2, Shield, LogOut, Github } from 'lucide-react'
import React, { useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onToggleSidebar: () => void
  isSidebarOpen: boolean
}

const githubUrl = 'https://github.com/conectlens/lenserfight'
const topUpUrl = `${CHAINABIT_APP_URL}/billing?utm_source=lenserfight&utm_medium=modal&utm_campaign=topup`

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { shareConfig } = useShareContext()
  const { pageActions } = useUI()
  const { lenser } = useLenser()
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isChainabitOpen, setIsChainabitOpen] = useState(false)
  const { activeWorkspace, humanWorkspace } = useLenserWorkspace()
  const { switchToProfile, isSwitching } = useWorkspaceSwitchController()
  const unreadCount = useUnreadCount()
  const { locale, setLocale } = useLocale()

  const isAgentOwner = activeWorkspace?.type === 'ai'
  const { state: chainabitState, credits, models, reconnect } = useChainabitConnection()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const chainabitButtonClass = (() => {
    if (chainabitState === 'no_account' || chainabitState === 'invalid_connection' || chainabitState === 'provider_error') {
      return 'flex items-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-400 transition-colors hover:text-red-700 dark:hover:text-red-300'
    }
    if (chainabitState === 'no_credits') {
      return 'flex items-center gap-1.5 text-xs font-medium text-amber-500 dark:text-amber-400 transition-colors hover:text-amber-700 dark:hover:text-amber-300'
    }
    return 'flex items-center gap-1.5 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400'
  })()

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

          <LocaleLanguageSelect
            className="mr-1"
            value={locale}
            onChange={setLocale}
          />

          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:hover:border-gray-500 dark:hover:text-gray-100"
          >
            <Github size={14} />
          </a>

          {!isAuthenticated && (
            <button
              onClick={() =>
                partnerApiClient
                  .startOAuthLogin(window.location.origin)
                  .catch((err: unknown) =>
                    toast.error(err instanceof Error ? err.message : 'Chainabit sign-in unavailable.')
                  )
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              title="Sign in with Chainabit"
            >
              <img src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png" width={16} height={16} alt="" className="rounded shrink-0" />
              Sign in
            </button>
          )}

          {isAuthenticated && (
            <button
              onClick={() => setIsChainabitOpen(true)}
              className={chainabitButtonClass}
              title="Chainabit — AI execution wallet"
              aria-label="Chainabit connection"
            >
              <img src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png" width={20} height={20} alt="" className="rounded shrink-0" />
              {chainabitState === 'connected' && credits !== null && (
                <span className="tabular-nums">{credits.toLocaleString()} cr</span>
              )}
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
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}
          {pageActions.length > 0 && <ActionMenu actions={pageActions} />}

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

      {isAuthenticated && (
        <ChainabitModal
          isOpen={isChainabitOpen}
          onClose={() => setIsChainabitOpen(false)}
          state={chainabitState}
          credits={credits}
          models={models}
          onReconnect={reconnect}
          topUpUrl={topUpUrl}
        />
      )}
    </header>
  )
}
