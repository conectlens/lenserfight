
import { queryKeys } from '@lenserfight/data/cache'
import {
  agentsService,
  lenserService,
  lensesService,
  reactionService,
  threadsService,
} from '@lenserfight/data/repositories'
import { AgentCard } from '@lenserfight/features/agents'
import { BadgeDisplay } from '@lenserfight/features/lenserboard'
import { useAuth } from '@lenserfight/features/auth'
import { ThreadsListCard } from '@lenserfight/features/home'
import { CreateLensModal, LensCard, useCreateLens } from '@lenserfight/features/lenses'
import { useShareContext } from '@lenserfight/features/share'
import { CreateThreadModal } from '@lenserfight/features/threads'
import { useAnalytics } from '@lenserfight/infra/analytics'
import { Button, EmptyState, SEOHead } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { useModalRouter } from '@lenserfight/ui/routing'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Award, Bot, FolderOpen, LogIn, MessageSquare, Plus, Trophy } from 'lucide-react'
import { supabase } from '@lenserfight/data/supabase'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'

import { LenserActionsList } from '../components/LenserActionsList'
import { LenserActivityHeatmap } from '../components/LenserActivityHeatmap'
import { LenserProfileHeader } from '../components/LenserProfileHeader'
import { LenserStatsRow } from '../components/LenserStatsRow'
import { LenserTabContent, LenserTabs, type LenserTabDefinition, type LenserTabId } from '../components/LenserTabs'
import { OwnerRecoveryBanner } from '../components/OwnerRecoveryBanner'
import { ProfileCompletionBanner } from '../components/ProfileCompletionBanner'
import { RestrictedProfileShell } from '../components/RestrictedProfileShell'
import { UnavailableProfile } from '../components/UnavailableProfile'
import { useLenser } from '../context/LenserContext'
import { useLenserWorkspace } from '../useLenserWorkspace'

import { AILenserProfilePage } from './AILenserProfilePage'

import type {
  ActivityFeedItem,
  Lenser,
  LenserActivityPoint,
  LenserProfileDTO,
  LenserStats,
  LensViewModel,
  ProfileAccessPayload,
  ThreadFeedItem,
  XPSummary,
} from '@lenserfight/types'

type StandardTab = 'actions' | 'lenses' | 'threads' | 'challenges' | 'agents' | 'badges'

interface TabState {
  data: any[]
  page: number
  hasMore: boolean
  isLoaded: boolean
}

const INITIAL_TAB_STATE: TabState = {
  data: [],
  page: 0,
  hasMore: true,
  isLoaded: false,
}

const TAB_MAP: Record<string, LenserTabId> = {
  t: 'threads',
  p: 'lenses',
  a: 'actions',
  c: 'challenges',
  ag: 'agents',
  bd: 'badges',
}

const REVERSE_TAB_MAP: Partial<Record<LenserTabId, string>> = {
  threads: 't',
  lenses: 'p',
  actions: 'a',
  challenges: 'c',
  agents: 'ag',
  badges: 'bd',
  overview: 'ov',
  workflows: 'wf',
  logs: 'lg',
  schedules: 'sc',
}

const PAGE_SIZE = 9

function isStandardTab(tab: LenserTabId): tab is StandardTab {
  return ['actions', 'lenses', 'threads', 'challenges', 'agents', 'badges'].includes(tab)
}

function buildProfileTabs(
  isOwner: boolean,
  viewedProfile: LenserProfileDTO | null
): LenserTabDefinition[] {
  const tabs: LenserTabDefinition[] = [
    { id: 'threads', label: 'Threads' },
    { id: 'lenses', label: 'Lenses' },
  ]

  if (!(!isOwner && viewedProfile?.hide_actions)) {
    tabs.push({ id: 'actions', label: 'Actions' })
  }

  tabs.push({ id: 'challenges', label: 'Challenge History' })

  tabs.push({ id: 'badges', label: 'Badges' })

  if (isOwner) {
    tabs.push({ id: 'agents', label: 'Agents' })
  }

  return tabs
}

export const LenserProfilePage: React.FC = () => {
  const { handle, tab: routeTab } = useParams<{ handle: string; tab?: string }>()
  const navigate = useNavigate()
  const { lenser: activeWorkspace } = useLenser()
  const { user: authUser, isLoading: isAuthLoading } = useAuth()
  const { setShareConfig } = useShareContext()
  const { trackView } = useAnalytics()
  const queryClient = useQueryClient()
  const { open: openModal } = useModalRouter()
  const { isOwnedWorkspace } = useLenserWorkspace()

  const { data: accessPayload = null, isLoading: loadingProfile } = useQuery<ProfileAccessPayload | null>({
    queryKey: [...queryKeys.lenser.profile(handle!), authUser?.id ?? 'anonymous'],
    queryFn: async () => {
      const result = await lenserService.getProfile(handle!)
      return result ?? null
    },
    enabled: !!handle && !isAuthLoading,
  })

  const routeState = accessPayload?.route_state ?? null
  const viewedProfile = accessPayload?.profile ?? null
  const relationshipState = accessPayload?.relationship_state ?? null
  const isOwner = !!viewedProfile && isOwnedWorkspace(viewedProfile.id)

  const { data: completionScore = null } = useQuery<number | null>({
    queryKey: ['profile-completion-score', viewedProfile?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc('fn_profile_completion_score', {
        p_lenser_id: viewedProfile!.id,
      })
      return typeof data === 'number' ? data : null
    },
    enabled: isOwner && !!viewedProfile?.id,
    staleTime: 1000 * 60 * 5,
  })

  const tabs = useMemo(
    () => buildProfileTabs(isOwner, viewedProfile),
    [isOwner, viewedProfile]
  )

  const defaultTab: LenserTabId = 'threads'
  const routeTabId = routeTab ? TAB_MAP[routeTab] : undefined
  const activeTab: LenserTabId =
    routeTabId && tabs.some((tab) => tab.id === routeTabId) ? routeTabId : defaultTab
  const activeStandardTab = isStandardTab(activeTab) ? activeTab : null

  const { data: activity = [] } = useQuery<LenserActivityPoint[]>({
    queryKey: queryKeys.lenser.activity(handle!),
    queryFn: () => lenserService.getLenserActivity(handle!),
    enabled: !!handle && !!viewedProfile,
  })

  const stats = useMemo<LenserStats | null>(() => {
    if (!viewedProfile) return null
    return {
      threadsCount: Number(viewedProfile.thread_count ?? 0),
      promptsCount: Number(viewedProfile.prompt_count ?? 0),
      followersCount: Number(viewedProfile.follower_count ?? 0),
      followingCount: Number(viewedProfile.following_count ?? 0),
      winsCount: 0,
    }
  }, [viewedProfile])

  const xpSummary = useMemo<XPSummary | null>(() => {
    if (!viewedProfile) return null
    return {
      totalXp: Number(viewedProfile.total_xp ?? 0),
      currentLevel: Number(viewedProfile.current_level ?? 1),
      rank: viewedProfile.join_order ?? undefined,
      currentLevelMinXp: Number(viewedProfile.min_xp ?? 0),
      currentLevelMaxXp: Number(viewedProfile.max_xp ?? 0),
    }
  }, [viewedProfile])

  const [tabCache, setTabCache] = useState<Record<StandardTab, TabState>>({
    threads: { ...INITIAL_TAB_STATE },
    lenses: { ...INITIAL_TAB_STATE },
    actions: { ...INITIAL_TAB_STATE },
    challenges: { ...INITIAL_TAB_STATE },
    agents: { ...INITIAL_TAB_STATE },
    badges: { ...INITIAL_TAB_STATE },
  })
  const [loadingTab, setLoadingTab] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const activeStandardState = activeStandardTab ? tabCache[activeStandardTab] : INITIAL_TAB_STATE
  const { data: items, page, hasMore } = activeStandardState

  const {
    isOpen: isPromptModalOpen,
    openModal: openPromptModal,
    closeModal: closePromptModal,
    form: promptForm,
    isSubmitting: isPromptSubmitting,
    error: promptError,
    submit: submitPrompt,
    isEditMode: isPromptEditMode,
  } = useCreateLens()

  const [isThreadModalOpen, setIsThreadModalOpen] = useState(false)
  const [editingThread, setEditingThread] = useState<any>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    type: 'prompt' | 'thread'
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const contentVisibility = viewedProfile?.content_visibility ?? 'public'
  const canViewContent =
    isOwner ||
    contentVisibility === 'public' ||
    (contentVisibility === 'community' && !!authUser)

  useEffect(() => {
    if (!handle) return
    setTabCache({
      threads: { ...INITIAL_TAB_STATE },
      lenses: { ...INITIAL_TAB_STATE },
      actions: { ...INITIAL_TAB_STATE },
      challenges: { ...INITIAL_TAB_STATE },
      agents: { ...INITIAL_TAB_STATE },
      badges: { ...INITIAL_TAB_STATE },
    })
  }, [handle])

  useEffect(() => {
    if (viewedProfile && handle) {
      trackView('profile', handle)
    }
  }, [viewedProfile?.id, handle, trackView])

  useEffect(() => {
    if (viewedProfile) {
      setShareConfig({
        title: viewedProfile.display_name,
        resourceType: 'profile',
        resourceId: viewedProfile.id,
        slug: viewedProfile.handle,
      })
    }
    return () => setShareConfig(null)
  }, [viewedProfile, setShareConfig])

  const fetchTabData = async (targetTab: StandardTab, pageNum: number, refresh = false) => {
    if (!viewedProfile) return
    if (!authUser) return
    if (!refresh && tabCache[targetTab].isLoaded && pageNum === 0) return

    if (pageNum === 0) setLoadingTab(true)

    try {
      const offset = pageNum * PAGE_SIZE
      let newItems: any[] = []
      const viewerId = isOwner ? viewedProfile.id : activeWorkspace?.id

      switch (targetTab) {
        case 'lenses':
          newItems = await lensesService.getLenserLenses(viewedProfile.handle, offset, PAGE_SIZE, viewerId)
          break
        case 'threads':
          newItems = await threadsService.getThreadsByLenser(viewedProfile.handle, viewerId, offset, PAGE_SIZE)
          break
        case 'actions':
          newItems = await reactionService.getLenserActivityFeed(viewedProfile.handle, offset, PAGE_SIZE)
          break
        case 'agents':
          if (pageNum === 0) {
            newItems = await agentsService.getAgentsByOwner(viewedProfile.id)
          }
          break
        case 'challenges':
          newItems = []
          break
      }

      setTabCache((previous) => {
        const currentData = previous[targetTab].data
        const updatedData = refresh || pageNum === 0 ? newItems : [...currentData, ...newItems]

        return {
          ...previous,
          [targetTab]: {
            data: updatedData,
            page: pageNum,
            hasMore: newItems.length === PAGE_SIZE,
            isLoaded: true,
          },
        }
      })
    } catch (cause) {
      console.error(`Failed to fetch ${targetTab}`, cause)
    } finally {
      setLoadingTab(false)
    }
  }

  useEffect(() => {
    if (!viewedProfile || !activeStandardTab) return
    // AI profiles render AILenserProfilePage which owns its own data fetching.
    // Skip standard-tab fetching here to avoid duplicate threads/lenses/actions calls.
    if (viewedProfile.type === 'ai') return
    if (!tabCache[activeStandardTab].isLoaded) {
      fetchTabData(activeStandardTab, 0)
    }
  }, [activeStandardTab, viewedProfile?.handle, viewedProfile?.type, activeWorkspace?.id])

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (!activeStandardTab || loadingTab) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          fetchTabData(activeStandardTab, page + 1)
        }
      })

      if (node) observer.current.observe(node)
    },
    [activeStandardTab, hasMore, loadingTab, page]
  )

  const handleTabChange = (newTab: LenserTabId) => {
    if (newTab === activeTab) return
    const shortcode = REVERSE_TAB_MAP[newTab]
    if (!shortcode) return
    navigate(`/lenser/${handle}/${shortcode}`, { preventScrollReset: true })
  }

  const handleProfileUpdate = (_updatedLenser: Lenser) => {
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.lenser.profile(handle!), authUser?.id ?? 'anonymous'],
    })
  }

  const handleEditPrompt = (id: string) => {
    const viewerId = isOwner && viewedProfile ? viewedProfile.id : activeWorkspace?.id
    lensesService.getLensDetail(id, viewerId).then((detail) => {
      if (!detail) return
      openPromptModal({
        id: detail.id,
        title: detail.title,
        content: detail.content,
        tags: detail.tags,
        visibility: detail.visibility,
      })
    })
  }

  const handleEditThread = (id: string) => {
    const threadToEdit = items.find((thread: any) => thread.id === id)
    if (!threadToEdit) return

    setEditingThread({
      id: threadToEdit.id,
      title: threadToEdit.title,
      content: threadToEdit.content,
      tags: threadToEdit.tags.map((tag: any) => tag.name),
      visibility: threadToEdit.visibility,
    })
    setIsThreadModalOpen(true)
  }

  const removeCacheItem = (tab: StandardTab, itemId: string) => {
    setTabCache((previous) => ({
      ...previous,
      [tab]: {
        ...previous[tab],
        data: previous[tab].data.filter((item) => item.id !== itemId),
      },
    }))
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !activeWorkspace) return
    setIsDeleting(true)
    try {
      if (deleteTarget.type === 'prompt') {
        await lensesService.deleteLens(deleteTarget.id, activeWorkspace.handle)
        removeCacheItem('lenses', deleteTarget.id)
      } else {
        await threadsService.deleteThread(deleteTarget.id, activeWorkspace.handle)
        removeCacheItem('threads', deleteTarget.id)
      }
      setDeleteTarget(null)
    } catch (cause) {
      console.error(cause)
      alert('Failed to delete item.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMutationSuccess = (tab: StandardTab) => {
    fetchTabData(tab, 0, true)
  }

  const handlePromptSubmit = () => {
    handleMutationSuccess('lenses')
  }

  const SkeletonLoader = () => {
    if (activeStandardTab === 'lenses') {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800" />
          ))}
        </div>
      )
    }

    if (activeStandardTab === 'threads') {
      return (
        <div className="space-y-6">
          {[1, 2].map((item) => (
            <div key={item} className="h-48 rounded-2xl bg-gray-200 animate-pulse dark:bg-gray-800" />
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-20 rounded-xl bg-gray-200 animate-pulse dark:bg-gray-800" />
        ))}
      </div>
    )
  }

  if (loadingProfile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-8 animate-pulse">
          <div className="h-64 rounded-3xl bg-gray-200 dark:bg-gray-800" />
          <div className="mt-4 flex gap-6 px-6">
            <div className="h-32 w-32 -mt-20 rounded-full border-4 border-white bg-gray-200 dark:border-gray-900 dark:bg-gray-800" />
            <div className="flex-1 space-y-4 pt-4">
              <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (routeState === 'UNAVAILABLE_PROFILE') {
    return <UnavailableProfile />
  }

  if (routeState === 'RESTRICTED_PROFILE' && viewedProfile) {
    return (
      <RestrictedProfileShell
        profile={viewedProfile}
        relationshipState={relationshipState}
        isAuthenticated={!!activeWorkspace}
      />
    )
  }

  if (!viewedProfile) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-gray-500 dark:text-gray-400">Lenser not found</h2>
          <Button onClick={() => navigate('/')} className="w-auto" variant="ghost">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  if (viewedProfile.type === 'ai') {
    return (
      <AILenserProfilePage
        viewedProfile={viewedProfile}
        isOwner={isOwner}
        stats={stats}
        xpSummary={xpSummary}
        relationshipState={relationshipState}
        routeTab={routeTab}
        handle={handle!}
        onProfileUpdate={handleProfileUpdate}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <SEOHead type="profile" data={{ lenser: viewedProfile, stats: stats! }} />

      {routeState === 'OWNER_RECOVERY_PROFILE' && (
        <OwnerRecoveryBanner
          handle={handle!}
          status={viewedProfile.status ?? ''}
          deletionDeadline={viewedProfile.deletion_deadline_at}
        />
      )}

      {isOwner && completionScore !== null && (
        <ProfileCompletionBanner
          score={completionScore}
          bio={viewedProfile.bio}
          avatarUrl={viewedProfile.avatar_url}
          location={(viewedProfile as any).location}
          websiteUrl={(viewedProfile as any).website_url}
          bannerUrl={viewedProfile.banner_url}
        />
      )}

      <LenserProfileHeader
        lenser={viewedProfile}
        stats={stats}
        xpSummary={xpSummary}
        isOwner={isOwner}
        onProfileUpdate={handleProfileUpdate}
        relationshipState={relationshipState}
        onManageAgents={isOwner ? () => handleTabChange('agents') : undefined}
      />

      <div className="px-4 md:px-0">
        <LenserStatsRow stats={stats} xpSummary={xpSummary} />
      </div>

      <div className="px-4 md:px-0">
        <LenserActivityHeatmap data={activity} />
      </div>

      <div className="mt-8 px-0 md:px-0">
        <div className="px-4 md:px-0">
          <LenserTabs activeTab={activeTab} onChange={handleTabChange} tabs={tabs} />
        </div>

        <LenserTabContent activeTab={activeTab}>
        <div className="min-h-[300px] px-4 md:px-0">
          {activeStandardTab && !authUser && !isAuthLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <LogIn className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Sign in to view this content</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Create an account or sign in to explore this profile.</p>
              </div>
              <Button onClick={() => navigate('/auth/login')} className="!w-auto flex items-center gap-2">
                <LogIn size={16} /> Sign In
              </Button>
            </div>
          )}

          {activeStandardTab && authUser && activeStandardTab === 'actions' && (isOwner || !viewedProfile.hide_actions) && (
            <>
              {items.length > 0 ? (
                <LenserActionsList actions={items as ActivityFeedItem[]} />
              ) : (
                !loadingTab && <EmptyState icon={Activity} title="No recent activity." />
              )}
            </>
          )}

          {authUser && activeStandardTab === 'lenses' && !canViewContent && (
            <EmptyState icon={FolderOpen} title="This content is not public." />
          )}

          {authUser && activeStandardTab === 'lenses' && canViewContent && (
            <>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {items.map((prompt) => (
                    <div key={prompt.id} className="h-full">
                      <LensCard
                        lens={prompt as LensViewModel}
                        onClick={(id) => navigate(`/lenses/${id}`)}
                        isOwner={isOwner}
                        onEdit={handleEditPrompt}
                        onDelete={() => setDeleteTarget({ id: prompt.id, type: 'prompt' })}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                !loadingTab && (
                  <EmptyState
                    icon={FolderOpen}
                    title="No prompts created yet."
                    action={
                      isOwner && (
                        <Button onClick={() => openPromptModal()} className="!w-auto flex items-center gap-2">
                          <Plus size={16} /> Create Lens
                        </Button>
                      )
                    }
                  />
                )
              )}
            </>
          )}

          {authUser && activeStandardTab === 'threads' && !canViewContent && (
            <EmptyState icon={MessageSquare} title="This content is not public." />
          )}

          {authUser && activeStandardTab === 'threads' && canViewContent && (
            <>
              {items.length > 0 ? (
                <div className="space-y-6">
                  {items.map((thread) => (
                    <ThreadsListCard
                      key={thread.id}
                      thread={thread as ThreadFeedItem}
                      onOpen={(id) => navigate(`/threads/${id}`)}
                      isOwner={isOwner}
                      onEdit={handleEditThread}
                      onDelete={() => setDeleteTarget({ id: thread.id, type: 'thread' })}
                    />
                  ))}
                </div>
              ) : (
                !loadingTab && (
                  <EmptyState
                    icon={MessageSquare}
                    title="No threads posted yet."
                    action={
                      isOwner && (
                        <Button
                          onClick={() => setIsThreadModalOpen(true)}
                          className="!w-auto flex items-center gap-2"
                        >
                          <Plus size={16} /> Create Thread
                        </Button>
                      )
                    }
                  />
                )
              )}
            </>
          )}

          {authUser && activeStandardTab === 'challenges' && (
            <EmptyState icon={Trophy} title="No challenge history available." />
          )}

          {authUser && activeStandardTab === 'badges' && (
            <BadgeDisplay lenserId={viewedProfile.id} detailed />
          )}

          {authUser && activeStandardTab === 'agents' && (
            <>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} isOwner={isOwner} />
                  ))}
                </div>
              ) : (
                !loadingTab && (
                  <EmptyState
                    icon={Bot}
                    title="No AI Agents yet."
                    action={
                      isOwner && (
                        <Button onClick={() => openModal('create-agent')} className="!w-auto flex items-center gap-2">
                          <Plus size={16} /> Create Agent
                        </Button>
                      )
                    }
                  />
                )
              )}
            </>
          )}

          {authUser && loadingTab && (
            <div className="mt-6">
              <SkeletonLoader />
            </div>
          )}

          {authUser && <div ref={lastElementRef} className="h-4" />}
        </div>
        </LenserTabContent>
      </div>

      <CreateLensModal
        isOpen={isPromptModalOpen}
        onClose={closePromptModal}
        onSubmit={() => submitPrompt(handlePromptSubmit)}
        form={promptForm}
        isSubmitting={isPromptSubmitting}
        error={promptError}
        isEditMode={isPromptEditMode}
      />

      <CreateThreadModal
        isOpen={isThreadModalOpen}
        onClose={() => {
          setIsThreadModalOpen(false)
          setEditingThread(null)
        }}
        onSuccess={() => handleMutationSuccess('threads')}
        initialData={editingThread}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.type === 'prompt' ? 'Lens' : 'Thread'}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={isDeleting}
      />

      <Outlet />
    </div>
  )
}
