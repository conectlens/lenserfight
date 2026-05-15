import {
  MoreHorizontal,
  Settings,
  LogOut,
  User,
  Sparkles,
  MessageSquarePlus,
  Bell,
  Sun,
  Moon,
  Monitor,
  Bot,
  ChevronsUpDown,
  Check,
} from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { Avatar, Logo } from '@lenserfight/ui/components'
import { useNotifications } from '@lenserfight/features/notifications'
import { useAuth } from '@lenserfight/features/auth'
import { FeedbackModal } from '@lenserfight/features/feedback'
import {
  useLenser,
  useSidebarProfile,
  useHasLenserProfile,
  useLenserWorkspace,
  useWorkspaceSwitchController,
} from '@lenserfight/features/profile'
import { AgentSettingsSheet } from '@lenserfight/features/agents'
import { FEATURES } from '@lenserfight/utils/env'
import { useTheme } from '@lenserfight/ui/theme'
import type { Theme } from '@lenserfight/ui/theme'

import { SidebarItem } from './SidebarItem'
import { buildAgentSidebarSections } from './agentSidebar'
import { buildHumanSidebarSections } from './humanSidebar'
import { useWorkspaceMode } from './useWorkspaceMode'

const THEME_CYCLE: Theme[] = ['light', 'dark', 'system']
const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
}
const THEME_LABELS: Record<Theme, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system mode',
  system: 'Switch to light mode',
}
const THEME_NAMES: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

interface SidebarProps {
  isOpen: boolean
  isMobile: boolean
  onCloseMobile: () => void
  onOpenProfileSetup: () => void
}

// Strict route matching helper to prevent overlap (e.g. /len vs /lenser)
const isRouteActive = (currentPath: string, basePath: string, exact = false) => {
  // Normalize paths to remove trailing slashes unless it's root
  const normalize = (p: string) => (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p)
  const current = normalize(currentPath)
  const base = normalize(basePath)

  if (exact) return current === base
  // Match exact path OR path starting with base followed by /
  return current === base || current.startsWith(`${base}/`)
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isMobile,
  onCloseMobile,
  onOpenProfileSetup,
}) => {
  // Use LenserContext mainly for the handle/identity bootstrapping
  const { lenser: authLenser, redirectToOnboarding } = useLenser()
  const { hasLenser, isLoading: isLenserLoading } = useHasLenserProfile()
  const { logout, isAuthenticated, redirectToLogin } = useAuth()
  const { themeMode, setTheme } = useTheme()
  const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length]

  // All lenser profiles (human + owned AI agents) for workspace switcher
  const { workspaces, activeWorkspace } = useLenserWorkspace()
  const { switchToProfile } = useWorkspaceSwitchController()
  const { profile: compactProfile } = useSidebarProfile(
    activeWorkspace?.handle ?? authLenser?.handle,
    activeWorkspace?.id ?? authLenser?.id
  )

  // Fallback to authLenser if compact fetch hasn't populated yet to prevent empty state
  const displayProfile = compactProfile || activeWorkspace || authLenser

  // Auth-gating helpers for nav items that require a Lenser profile
  const isNavLocked = !hasLenser && !isLenserLoading
  const navLockReason = !isAuthenticated
    ? 'Sign in to access'
    : 'Create a Lenser profile to access'
  const handleLockedNav = () => {
    if (!isAuthenticated) redirectToLogin()
    else redirectToOnboarding()
  }

  const navigate = useNavigate()
  const location = useLocation()
  // Workspace mode is driven by the active workspace identity, not the URL.
  // activeWorkspace comes from fn_get_my_lensers (server-authoritative); fall back
  // to displayProfile only while the workspace list is still loading.
  const workspaceMode = useWorkspaceMode(activeWorkspace ?? displayProfile)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null)

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)
  const switcherButtonRef = useRef<HTMLButtonElement>(null)
  const [switcherPos, setSwitcherPos] = useState<{ top: number; left: number } | null>(null)

  const { unreadCount } = useNotifications(1)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [agentSettingsOpen, setAgentSettingsOpen] = useState(false)
  const [shownThemeName, setShownThemeName] = useState<string | null>(null)
  const themeNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAIWorkspace = workspaceMode === 'agent'

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSwitcherOpen &&
        switcherRef.current &&
        !switcherRef.current.contains(event.target as Node) &&
        switcherButtonRef.current &&
        !switcherButtonRef.current.contains(event.target as Node)
      ) {
        setIsSwitcherOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSwitcherOpen) {
        setIsSwitcherOpen(false)
        switcherButtonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSwitcherOpen])

  useEffect(() => {
    return () => {
      if (themeNameTimerRef.current) clearTimeout(themeNameTimerRef.current)
    }
  }, [])

  const desktopWidthClass = isOpen ? 'w-64' : 'w-20'

  const chromeClass =
    workspaceMode === 'agent'
      ? 'bg-white dark:bg-[#0a0a0a] border-r border-amber-200/50 dark:border-amber-500/10'
      : 'bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700'

  const containerClass = isMobile
    ? `fixed inset-y-0 left-0 h-full w-64 ${chromeClass} z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
    : `sticky top-0 h-screen flex-shrink-0 ${chromeClass} transition-all duration-300 ease-in-out flex flex-col ${desktopWidthClass}`

  const showOverlay = isMobile && isOpen

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) onCloseMobile()
  }

  const navSections =
    workspaceMode === 'agent' && activeWorkspace?.handle
      ? buildAgentSidebarSections(activeWorkspace.handle)
      : buildHumanSidebarSections({ isNavLocked })

  const handleProfileClick = () => {
    if (displayProfile?.handle) {
      handleNavigation(`/lenser/${displayProfile.handle}`)
    } else if (!isAuthenticated) {
      redirectToLogin()
    } else {
      onOpenProfileSetup()
    }
    if (isMobile) onCloseMobile()
  }

  const showLabels = isOpen || isMobile

  return (
    <>
      <style>{`
        @keyframes pulse-gold {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(255, 222, 89, 0.08); }
        }
        @keyframes shimmer-slide {
          0% { transform: translateX(-150%) skewX(-15deg); }
          20%, 100% { transform: translateX(150%) skewX(-15deg); }
        }
        @keyframes ambient-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(0,0,0,0); border-color: rgba(229, 231, 235, 1); }
          50% { box-shadow: 0 0 15px rgba(255, 222, 89, 0.15); border-color: rgba(255, 222, 89, 0.4); }
        }
        .animate-pulse-gold {
          animation: pulse-gold 7s ease-in-out infinite;
        }
        .animate-shimmer-slide {
          animation: shimmer-slide 8s ease-in-out infinite;
        }
        .animate-ambient-glow {
          animation: ambient-glow 5s ease-in-out infinite;
        }
      `}</style>

      {showOverlay && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside className={containerClass} aria-label="Main navigation">
        <div
          className={`h-16 flex items-center px-4 flex-shrink-0 ${!showLabels ? 'justify-center' : ''}`}
        >
          <div
            className="flex items-center gap-3 cursor-pointer group w-full"
            onClick={handleLogoClick}
            title="Go Home"
          >
            <div className="flex items-center min-w-0 transition-transform group-hover:scale-105">
              <Logo size={32} showWordmark={showLabels} />
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-hide flex flex-col pt-4 pb-2">
          <div className="px-3 space-y-3">
            {navSections.map((section) => (
              <div key={section.id}>
                {section.label && showLabels && (
                  <p
                    className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] ${workspaceMode === 'agent'
                      ? 'text-amber-600 dark:text-amber-500/80'
                      : 'text-gray-500 dark:text-gray-400'
                      }`}
                  >
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.id}
                      externalHref={item.externalHref}
                      onClick={item.path ? () => handleNavigation(item.path!) : undefined}
                      icon={item.icon}
                      label={item.label}
                      isActive={item.path ? isRouteActive(location.pathname, item.activePath ?? item.path, item.exact) : false}
                      collapsed={!showLabels}
                      locked={item.locked}
                      lockReason={item.locked ? navLockReason : undefined}
                      onLockedClick={item.locked ? handleLockedNav : undefined}
                      isComingSoon={item.isComingSoon}
                      wip={item.wip}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className={`flex-shrink-0 px-3 pb-3 pt-2 mt-auto space-y-3 ${workspaceMode === 'agent' ? 'bg-white dark:bg-[#0a0a0a]' : 'bg-gray-50 dark:bg-gray-800'}`}>
          {/* Feedback Button */}
          <div
            className={`${!showLabels ? '' : 'animate-in slide-in-from-bottom-3 duration-500 delay-75'}`}
          >
            <SidebarItem
              onClick={() => setIsFeedbackOpen(true)}
              icon={<MessageSquarePlus size={20} className="text-[#121212] dark:text-gray-100" />}
              label="Send Feedback"
              isActive={false}
              collapsed={!showLabels}
              className={`
                  !my-0 
                  border border-[#121212] dark:border-gray-500
                  text-[#121212] dark:text-gray-100 font-bold 
                  hover:bg-transparent
                  hover:shadow-md
                  transition-all
                `}
            />
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>

          <div className="relative">
            {/* Loading skeleton */}
            {isLenserLoading && (
              <div className={`flex items-center p-2 rounded-xl ${!showLabels ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex-shrink-0" />
                {showLabels && (
                  <div className="ml-3 flex-1 space-y-1.5">
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  </div>
                )}
              </div>
            )}

            {/* Be Lenser / Sign In CTA — shown when loaded but no lenser profile */}
            {!isLenserLoading && !hasLenser && (
              isAuthenticated ? (
                <button
                  onClick={onOpenProfileSetup}
                  className={`
                    flex items-center justify-center gap-2 bg-primary hover:bg-yellow-300 text-gray-900 font-bold rounded-xl shadow-lg transition-all w-full h-10
                    ${!showLabels ? 'rounded-full w-10 p-0' : 'px-4'}
                  `}
                  title="Be a Lenser"
                >
                  <Sparkles size={18} />
                  {showLabels && <span>Be Lenser</span>}
                </button>
              ) : (
                <button
                  onClick={() => redirectToLogin()}
                  className={`
                    flex items-center justify-center gap-2 bg-primary hover:bg-yellow-300 text-gray-900 font-bold rounded-xl shadow-lg transition-all w-full h-10
                    ${!showLabels ? 'rounded-full w-10 p-0' : 'px-4'}
                  `}
                  title="Sign in"
                >
                  <User size={18} />
                  {showLabels && <span>Sign In</span>}
                </button>
              )
            )}

            {/* Profile row — shown only when loaded and profile exists */}
            {!isLenserLoading && hasLenser && (
              <div
                className={`
                  flex items-center p-2 rounded-xl transition-all hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-600
                  ${!showLabels ? 'justify-center' : ''}
              `}
              >
                <div
                  className="relative flex-shrink-0"
                  onClick={handleProfileClick}
                >
                  <div className="relative">
                    <Avatar src={displayProfile?.avatar_url} size="sm" className="!w-9 !h-9" />
                    {/* Level Badge integrated if compact profile available */}
                    {compactProfile && (compactProfile.current_level ?? 0) > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[8px] font-bold px-1 rounded-full border border-white dark:border-gray-900 shadow-sm">
                        {compactProfile.current_level}
                      </div>
                    )}
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white dark:border-gray-900 rounded-full bg-red-500"></div>
                </div>

                {showLabels && (
                  <div
                    className="ml-3 flex-1 overflow-hidden"
                    onClick={handleProfileClick}
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {displayProfile?.display_name || 'Guest'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      @{displayProfile?.handle || 'guest'}
                    </p>
                    {displayProfile?.type === 'ai' && (
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary-yellow-700 dark:text-primary-yellow-400">
                        AI workspace active
                      </p>
                    )}
                  </div>
                )}

                {/* Workspace switcher — visible when there are multiple profiles (human + AI) */}
                {showLabels && FEATURES.AGENTS && workspaces.length > 1 && (
                  <div className="relative flex-shrink-0">
                    <button
                      ref={switcherButtonRef}
                      aria-label="Switch workspace"
                      aria-haspopup="listbox"
                      aria-expanded={isSwitcherOpen}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = switcherButtonRef.current?.getBoundingClientRect()
                        if (rect) setSwitcherPos({ top: rect.top, left: rect.left })
                        setIsSwitcherOpen((v) => !v)
                        setIsDropdownOpen(false)
                      }}
                      className={`p-1 rounded-md transition-colors ${isSwitcherOpen ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      title="Switch workspace"
                    >
                      <ChevronsUpDown size={14} />
                    </button>

                    {isSwitcherOpen && switcherPos && createPortal(
                      <div
                        ref={switcherRef}
                        role="listbox"
                        aria-label="Workspace switcher"
                        style={{
                          position: 'fixed',
                          top: switcherPos.top - 8,
                          left: switcherPos.left,
                          transform: 'translateY(-100%)',
                          zIndex: 9999,
                        }}
                        className="w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Switch workspace
                        </p>
                        {workspaces.map((profile) => (
                          <button
                            key={profile.id}
                            role="option"
                            aria-selected={profile.is_active}
                            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 transition-colors ${profile.type === 'ai'
                              ? profile.is_active
                                ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                              : profile.is_active
                                ? 'bg-gray-50 dark:bg-gray-700/50'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                              }`}
                            onClick={async () => {
                              setIsSwitcherOpen(false)
                              await switchToProfile(profile)
                            }}
                          >
                            <div className="relative flex-shrink-0">
                              <Avatar src={profile.avatar_url} size="sm" className="!w-6 !h-6" />
                              {profile.type === 'ai' && (
                                <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-3 h-3 rounded-full bg-primary border border-white dark:border-gray-800">
                                  <Bot size={7} className="text-gray-900" />
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate leading-tight">
                                {profile.display_name}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate leading-tight">
                                @{profile.handle}
                              </p>
                            </div>
                            {profile.type === 'ai' && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-yellow-700 dark:text-yellow-400 flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/40 px-1.5 py-0.5 rounded-full">
                                AI
                              </span>
                            )}
                            {profile.is_active && (
                              <Check size={13} className="text-primary flex-shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                  </div>
                )}

                {showLabels && (
                  <div className="relative">
                    <button
                      ref={buttonRef}
                      aria-label="Account menu"
                      aria-haspopup="menu"
                      aria-expanded={isDropdownOpen}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = buttonRef.current?.getBoundingClientRect()
                        if (rect) setDropdownPos({ top: rect.top, right: window.innerWidth - rect.right })
                        setIsDropdownOpen(!isDropdownOpen)
                      }}
                      className={`p-1.5 rounded-lg transition-colors relative ${isDropdownOpen ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <MoreHorizontal size={18} />
                      {FEATURES.NOTIFICATIONS && unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                      )}
                    </button>

                    {isDropdownOpen && dropdownPos && createPortal(
                      <div
                        ref={dropdownRef}
                        role="menu"
                        style={{
                          position: 'fixed',
                          top: dropdownPos.top - 8,
                          right: dropdownPos.right,
                          transform: 'translateY(-100%)',
                          zIndex: 9999,
                        }}
                        className="w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Account
                          </p>
                        </div>
                        <div className="p-1">
                          <button
                            role="menuitem"
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                            onClick={() => {
                              setIsDropdownOpen(false)
                              handleProfileClick()
                            }}
                          >
                            <User size={16} className="text-gray-400" />
                            My Profile
                          </button>

                          {FEATURES.AGENTS && hasLenser && !isAIWorkspace && (
                            <button
                              role="menuitem"
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                navigate('/lensers?type=my_agents')
                              }}
                            >
                              <Bot size={16} className="text-gray-400" />
                              My Agents
                            </button>
                          )}

                          {isAIWorkspace && activeWorkspace && (
                            <button
                              role="menuitem"
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                navigate(`/lenser/${activeWorkspace.handle}/ag/overview`)
                              }}
                            >
                              <Bot size={16} className="text-amber-500" />
                              Control Room
                            </button>
                          )}

                          <button
                            role="menuitem"
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                            onClick={() => {
                              setIsDropdownOpen(false)
                              navigate('/notifications')
                            }}
                          >
                            <div className="relative flex-shrink-0">
                              <Bell
                                size={16}
                                className={unreadCount > 0 ? 'text-primary-yellow-500' : 'text-gray-400'}
                              />
                              {unreadCount > 0 && (
                                <>
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-yellow-500 rounded-full animate-pulse" />
                                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-yellow-500 rounded-full opacity-60 animate-ping" />
                                </>
                              )}
                            </div>
                            <span className="flex-1">Notifications</span>
                            {unreadCount > 0 && (
                              <span className="bg-primary-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full h-4 flex items-center justify-center leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </button>

                          <button
                            role="menuitem"
                            onClick={() => {
                              const nameToShow = THEME_NAMES[nextTheme]
                              setTheme(nextTheme)
                              setShownThemeName(nameToShow)
                              if (themeNameTimerRef.current) clearTimeout(themeNameTimerRef.current)
                              themeNameTimerRef.current = setTimeout(() => setShownThemeName(null), 2000)
                            }}
                            title={THEME_LABELS[themeMode]}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                          >
                            {THEME_ICONS[themeMode]}
                            <span key={shownThemeName ?? 'theme'} className="animate-in fade-in duration-300">
                              {shownThemeName ?? 'Theme'}
                            </span>
                          </button>

                          {isAIWorkspace && activeWorkspace ? (
                            <button
                              role="menuitem"
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                setAgentSettingsOpen(true)
                              }}
                            >
                              <Bot size={16} className="text-amber-500" />
                              Agent Settings
                            </button>
                          ) : (
                            <button
                              role="menuitem"
                              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white flex items-center gap-3 transition-colors"
                              onClick={() => {
                                setIsDropdownOpen(false)
                                navigate('/settings/account')
                              }}
                            >
                              <Settings size={16} className="text-gray-400" />
                              Settings
                            </button>
                          )}
                        </div>
                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-0"></div>
                        <div className="p-1">
                          <button
                            role="menuitem"
                            onClick={async () => {
                              setIsDropdownOpen(false)
                              await logout()
                              navigate('/auth/login')
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
                          >
                            <LogOut size={16} />
                            Logout
                          </button>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {isAIWorkspace && activeWorkspace && (
        <AgentSettingsSheet
          open={agentSettingsOpen}
          onClose={() => setAgentSettingsOpen(false)}
          profileId={activeWorkspace.id}
          handle={activeWorkspace.handle}
        />
      )}
    </>
  )
}
