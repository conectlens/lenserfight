import { FolderOpen, MessageSquare, Trophy, Activity, Plus, Bot } from 'lucide-react'
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Outlet } from 'react-router-dom'

import { Button, EmptyState } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { SEOHead } from '@lenserfight/ui/components'
import { FEATURES } from '@lenserfight/utils/env'
import { useLenser } from '@lenserfight/features/profile'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { useAnalytics } from '@lenserfight/infra/analytics'
import { queryKeys } from '@lenserfight/data/cache'
import { lenserService } from '@lenserfight/data/repositories'
import { lensesService } from '@lenserfight/data/repositories'
import { reactionService } from '@lenserfight/data/repositories'
import { threadsService } from '@lenserfight/data/repositories'
import { Lenser, LenserStats, LenserActivityPoint, LenserProfileDTO, ProfileAccessPayload } from '@lenserfight/types'
import { LensViewModel } from '@lenserfight/types'
import { ActivityFeedItem } from '@lenserfight/types'
import { ThreadFeedItem } from '@lenserfight/types'
import { XPSummary } from '@lenserfight/types'
import { ThreadsListCard } from '@lenserfight/features/home'
import { CreateLensModal } from '@lenserfight/features/lenses'
import { LensCard } from '@lenserfight/features/lenses'
import { useCreateLens } from '@lenserfight/features/lenses'
import { CreateThreadModal } from '@lenserfight/features/threads'
import { AgentCard } from '@lenserfight/features/agents'
import { useModalRouter } from '@lenserfight/ui/routing'
import { agentsService } from '@lenserfight/data/repositories'
import { LenserActionsList } from '../components/LenserActionsList'
import { LenserActivityHeatmap } from '../components/LenserActivityHeatmap'
import { LenserProfileHeader } from '../components/LenserProfileHeader'
import { LenserStatsRow } from '../components/LenserStatsRow'
import { LenserTabs } from '../components/LenserTabs'
import { RestrictedProfileShell } from '../components/RestrictedProfileShell'
import { UnavailableProfile } from '../components/UnavailableProfile'
import { OwnerRecoveryBanner } from '../components/OwnerRecoveryBanner'

type TabType = 'actions' | 'lenses' | 'threads' | 'challenges' | 'agents'

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

const TAB_MAP: Record<string, TabType> = {
  t: 'threads',
  p: 'lenses',
  a: 'actions',
  c: 'challenges',
  ag: 'agents',
}

const REVERSE_TAB_MAP: Record<string, string> = {
  threads: 't',
  lenses: 'p',
  actions: 'a',
  challenges: 'c',
  agents: 'ag',
}

const PAGE_SIZE = 9

export const LenserProfilePage: React.FC = () => {
  const { handle, tab: routeTab } = useParams<{ handle: string; tab?: string }>()
  const navigate = useNavigate()
  const { lenser: currentUser } = useLenser() // The currently authenticated user
  const { user: authUser, isLoading: isAuthLoading } = useAuth()
  const { setShareConfig } = useShareContext()
  const { trackView } = useAnalytics()
  const queryClient = useQueryClient()

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

  const { data: activity = [] } = useQuery<LenserActivityPoint[]>({
    queryKey: queryKeys.lenser.activity(handle!),
    queryFn: () => lenserService.getLenserActivity(handle!),
    enabled: !!handle && !!viewedProfile && FEATURES.LENSER_ACTIVITY,
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

  const [tabCache, setTabCache] = useState<Record<TabType, TabState>>({
    threads: { ...INITIAL_TAB_STATE },
    lenses: { ...INITIAL_TAB_STATE },
    actions: { ...INITIAL_TAB_STATE },
    challenges: { ...INITIAL_TAB_STATE },
    agents: { ...INITIAL_TAB_STATE },
  })

  const [loadingTab, setLoadingTab] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const activeTab: TabType = routeTab && TAB_MAP[routeTab] ? TAB_MAP[routeTab] : 'threads'

  const { data: items, page, hasMore, isLoaded } = tabCache[activeTab]

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

  // For AI agent profiles, fetch the agent record to check owner_lenser_id
  const { data: agentProfile = null } = useQuery({
    queryKey: queryKeys.agents.detail(viewedProfile?.id ?? ''),
    queryFn: () => agentsService.getAgentProfile(viewedProfile!.id),
    enabled: !!viewedProfile && viewedProfile.type === 'ai',
    staleTime: 1000 * 60 * 5,
  })

  // Ownership Check: true if the authenticated user IS the profile,
  // or if the authenticated user owns the AI agent profile being viewed
  const isOwner = !!(
    currentUser &&
    handle &&
    (currentUser.handle.toLowerCase() === handle.toLowerCase() ||
      (viewedProfile?.type === 'ai' && agentProfile?.owner_lenser_id === currentUser.id))
  )

  const { open: openModal } = useModalRouter()

  // Content visibility: 'public' = anyone, 'community' = authenticated only, 'private' = owner only
  const contentVisibility = viewedProfile?.content_visibility ?? 'public'
  const canViewContent =
    isOwner ||
    contentVisibility === 'public' ||
    (contentVisibility === 'community' && !!authUser)

  // Reset tab cache when navigating to a different profile
  useEffect(() => {
    if (!handle) return
    setTabCache({
      threads: { ...INITIAL_TAB_STATE },
      lenses: { ...INITIAL_TAB_STATE },
      actions: { ...INITIAL_TAB_STATE },
      challenges: { ...INITIAL_TAB_STATE },
      agents: { ...INITIAL_TAB_STATE },
    })
  }, [handle])

  // Track profile view once loaded
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

  const fetchTabData = async (targetTab: TabType, pageNum: number, refresh = false) => {
    if (!viewedProfile) return

    if (!refresh && tabCache[targetTab].isLoaded && pageNum === 0) return

    if (pageNum === 0) setLoadingTab(true)

    try {
      const offset = pageNum * PAGE_SIZE
      let newItems: any[] = []

      // Viewer ID is used to determine visibility (show private items if owner)
      const viewerId = currentUser?.id

      switch (targetTab) {
        case 'lenses':
          newItems = await lensesService.getLenserLenses(
            viewedProfile.handle,
            offset,
            PAGE_SIZE,
            viewerId
          )
          break
        case 'threads':
          newItems = await threadsService.getThreadsByLenser(
            viewedProfile.handle,
            viewerId,
            offset,
            PAGE_SIZE
          )
          break
        case 'actions':
          newItems = await reactionService.getLenserActivityFeed(
            viewedProfile.handle,
            offset,
            PAGE_SIZE
          )
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

      setTabCache((prev) => {
        const currentData = prev[targetTab].data
        const updatedData = refresh || pageNum === 0 ? newItems : [...currentData, ...newItems]

        return {
          ...prev,
          [targetTab]: {
            data: updatedData,
            page: pageNum,
            hasMore: newItems.length === PAGE_SIZE,
            isLoaded: true,
          },
        }
      })
    } catch (e) {
      console.error(`Failed to fetch ${targetTab}`, e)
    } finally {
      setLoadingTab(false)
    }
  }

  useEffect(() => {
    if (viewedProfile) {
      // If tab data not loaded, fetch it
      if (!tabCache[activeTab].isLoaded) {
        fetchTabData(activeTab, 0)
      }
    }
  }, [activeTab, viewedProfile?.handle, currentUser?.id])

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingTab) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1
          fetchTabData(activeTab, nextPage)
        }
      })

      if (node) observer.current.observe(node)
    },
    [loadingTab, hasMore, activeTab, page, viewedProfile?.handle]
  )

  const handleTabChange = (newTab: TabType) => {
    if (newTab === activeTab) return
    const code = REVERSE_TAB_MAP[newTab]
    navigate(`/lenser/${handle}/${code}`)
  }

  const handleProfileUpdate = (_updatedLenser: Lenser) => {
    queryClient.invalidateQueries({
      queryKey: [...queryKeys.lenser.profile(handle!), authUser?.id ?? 'anonymous'],
    })
  }

  const handleEditPrompt = (id: string) => {
    const promptToEdit = items.find((p: any) => p.id === id)
    if (promptToEdit) {
      lensesService.getLensDetail(id, currentUser?.id).then((detail) => {
        if (detail) {
          openPromptModal({
            id: detail.id,
            title: detail.title,
            content: detail.content,
            tags: detail.tags,
            visibility: detail.visibility,
          })
        }
      })
    }
  }

  const handleEditThread = (id: string) => {
    const threadToEdit = items.find((t: any) => t.id === id)
    if (threadToEdit) {
      setEditingThread({
        id: threadToEdit.id,
        title: threadToEdit.title,
        content: threadToEdit.content,
        tags: threadToEdit.tags.map((t: any) => t.name),
        visibility: threadToEdit.visibility,
      })
      setIsThreadModalOpen(true)
    }
  }

  const removeCacheItem = (tab: TabType, itemId: string) => {
    setTabCache((prev) => {
      const tabState = prev[tab]
      const newData = tabState.data.filter((item) => item.id !== itemId)
      return {
        ...prev,
        [tab]: { ...tabState, data: newData },
      }
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !currentUser) return
    setIsDeleting(true)
    try {
      // Use current user handle for authorization check in service
      if (deleteTarget.type === 'prompt') {
        await lensesService.deleteLens(deleteTarget.id, currentUser.handle)
        removeCacheItem('lenses', deleteTarget.id)
        alert('Lens deleted successfully.')
      } else {
        await threadsService.deleteThread(deleteTarget.id, currentUser.handle)
        removeCacheItem('threads', deleteTarget.id)
        alert('Thread deleted successfully.')
      }
      setDeleteTarget(null)
    } catch (e) {
      console.error(e)
      alert('Failed to delete item.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleMutationSuccess = (tab: TabType) => {
    fetchTabData(tab, 0, true)
  }

  const handlePromptSubmit = (id: string) => {
    handleMutationSuccess('lenses')
  }

  const SkeletonLoader = () => {
    if (activeTab === 'lenses') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            ></div>
          ))}
        </div>
      )
    }
    if (activeTab === 'threads') {
      return (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"
            ></div>
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
        ))}
      </div>
    )
  }


  if (loadingProfile) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="animate-pulse space-y-8">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
          <div className="flex gap-6 mt-4 px-6">
            <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-800 -mt-20 border-4 border-white dark:border-gray-900"></div>
            <div className="flex-1 space-y-4 pt-4">
              <div className="w-1/3 h-8 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Route state branching
  if (routeState === 'UNAVAILABLE_PROFILE') {
    return <UnavailableProfile />
  }

  if (routeState === 'RESTRICTED_PROFILE' && viewedProfile) {
    return (
      <RestrictedProfileShell
        profile={viewedProfile}
        relationshipState={relationshipState}
        isAuthenticated={!!currentUser}
      />
    )
  }

  if (!viewedProfile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-500 dark:text-gray-400 mb-2">
            Lenser not found
          </h2>
          <Button onClick={() => navigate('/')} className="w-auto" variant="ghost">
            Return Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <SEOHead type="profile" data={{ lenser: viewedProfile, stats }} />

      {routeState === 'OWNER_RECOVERY_PROFILE' && (
        <OwnerRecoveryBanner
          handle={handle!}
          status={viewedProfile.status ?? ''}
          deletionDeadline={viewedProfile.deletion_deadline_at}
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
        onEditAgent={
          isOwner && viewedProfile.type === 'ai' && agentProfile
            ? () => navigate(`/lenser/${viewedProfile.handle}/agent?agentId=${agentProfile.ai_lenser_id}`)
            : undefined
        }
      />

      {stats && (
        <div className="px-4 md:px-0">
          <LenserStatsRow
            stats={stats}
            xpSummary={xpSummary}
          />
        </div>
      )}

      {FEATURES.LENSER_ACTIVITY && (
        <div className="px-4 md:px-0">
          <LenserActivityHeatmap data={activity} />
        </div>
      )}

      <div className="px-0 md:px-0 mt-8">
        <div className="px-4 md:px-0">
          <LenserTabs
            activeTab={activeTab}
            onChange={handleTabChange}
            hideActions={!isOwner && !!viewedProfile?.hide_actions}
            showAgents={isOwner}
          />
        </div>

        <div className="min-h-[300px] px-4 md:px-0">
          {activeTab === 'actions' && (isOwner || !viewedProfile?.hide_actions) && (
            <>
              {items.length > 0 ? (
                <LenserActionsList actions={items as ActivityFeedItem[]} />
              ) : (
                !loadingTab && <EmptyState icon={Activity} title="No recent activity." />
              )}
            </>
          )}

          {activeTab === 'lenses' && !canViewContent && (
            <EmptyState icon={FolderOpen} title="This content is not public." />
          )}

          {activeTab === 'lenses' && canViewContent && (
            <>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
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
                        <Button
                          onClick={() => openPromptModal()}
                          className="!w-auto flex items-center gap-2"
                        >
                          <Plus size={16} /> Create Lens
                        </Button>
                      )
                    }
                  />
                )
              )}
            </>
          )}

          {activeTab === 'threads' && !canViewContent && (
            <EmptyState icon={MessageSquare} title="This content is not public." />
          )}

          {activeTab === 'threads' && canViewContent && (
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

          {activeTab === 'challenges' && (
            <EmptyState icon={Trophy} title="No challenge history available." />
          )}

          {activeTab === 'agents' && FEATURES.AGENTS && (
            <>
              {items.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        <Button
                          onClick={() => openModal('create-agent')}
                          className="!w-auto flex items-center gap-2"
                        >
                          <Plus size={16} /> Create Agent
                        </Button>
                      )
                    }
                  />
                )
              )}
            </>
          )}

          {loadingTab && (
            <div className="mt-6">
              <SkeletonLoader />
            </div>
          )}

          <div ref={lastElementRef} className="h-4" />
        </div>
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

      {/* Nested route outlet — renders AgentManageModal at /lenser/:handle/agent */}
      <Outlet />

    </div>
  )
}
