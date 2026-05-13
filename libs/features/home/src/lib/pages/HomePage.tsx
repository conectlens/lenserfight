
import { useAuth } from '@lenserfight/features/auth'
import {
  useThreadsFeed,
  useTopLenses,
  useTrendingTags,
  useLatestLensers,
  usePersonalFeed,
  usePersonalPrompts,
  useFollowingFeed,
  useSuggestedLensers,
  useFollowedTags,
  useFollowTag,
  useUnfollowTag,
  useFollowLenser,
  useUnfollowLenser,
} from '@lenserfight/features/home'
import { useLenser } from '@lenserfight/features/profile'
import { CreateThreadModal } from '@lenserfight/features/threads'
import { Avatar, Button, Card, EmptyState, HelpButton, TagBadge } from '@lenserfight/ui/components'
import { PageMeta } from '@lenserfight/ui/layout'
import { buildAuthReturnUrl } from '@lenserfight/utils/dom'
import { AUTH_BASE_URL, FEATURES } from '@lenserfight/utils/env'
import {
  Plus,
  ChevronRight,
  MessageSquareOff,
  AlertCircle,
  Tag,
  Sparkles,
  GitBranch,
  Swords,
  Vote,
  ImageIcon,
  Video,
  UserCircle2,
  Code2,
  Languages,
  MessageSquare,
  Library,
} from 'lucide-react'
import React, { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { FollowingLensesCarousel } from '../components/FollowingLensesCarousel'
import { HomePromoSection } from '../components/HomePromoSection'
import { ThreadsList } from '../components/ThreadsList'

interface HomePageProps {
  /**
   * V5 — Optional render slot for the live battles spectator widget.
   * Wired in `apps/web/WebRouter.tsx` (composition root) to avoid a
   * cyclic dependency between feature-home and feature-battles.
   */
  spectatorSlot?: React.ReactNode
}

export const HomePage: React.FC<HomePageProps> = ({ spectatorSlot }) => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { lenser, hasLenser } = useLenser()
  const lenserId = lenser?.id
  const showForYou = isAuthenticated && hasLenser

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [feedTab, setFeedTab] = React.useState<'for_you' | 'following' | 'trending'>('for_you')
  const activeTab = showForYou ? feedTab : 'trending'
  const [loadSidebarWidgets, setLoadSidebarWidgets] = React.useState(false)
  const sidebarWidgetsLoading = !loadSidebarWidgets

  React.useEffect(() => {
    const raf = window.requestAnimationFrame(() => setLoadSidebarWidgets(true))
    return () => window.cancelAnimationFrame(raf)
  }, [])

  // Global trending feed (always fetched as fallback / trending tab)
  const {
    data: threadsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: threadsLoading,
  } = useThreadsFeed()

  // Personal feed (enabled only when authenticated + has lenser profile)
  const {
    data: personalData,
    fetchNextPage: fetchNextPersonal,
    hasNextPage: hasNextPersonal,
    isFetchingNextPage: isFetchingNextPersonal,
    isLoading: personalLoading,
  } = usePersonalFeed(showForYou ? lenserId : undefined, activeTab === 'for_you')

  const {
    data: followingThreadsData,
    isLoading: followingThreadsLoading,
  } = useFollowingFeed(showForYou ? lenserId : undefined, activeTab === 'following')

  // Sidebar widgets
  const { data: topPrompts, isLoading: promptsLoading } = useTopLenses(loadSidebarWidgets)
  const { data: personalPromptsData, isLoading: personalPromptsLoading } = usePersonalPrompts(
    showForYou ? lenserId : undefined,
    loadSidebarWidgets && activeTab === 'for_you'
  )

  const {
    data: latestLensers,
    isLoading: lensersLoading,
    isError: lensersError,
  } = useLatestLensers(loadSidebarWidgets)
  const { data: suggestedLensers, isLoading: suggestedLoading } = useSuggestedLensers(
    showForYou ? lenserId : undefined,
    loadSidebarWidgets
  )

  const { data: trendingTags, isLoading: tagsLoading, isError: tagsError } = useTrendingTags(
    loadSidebarWidgets
  )
  const { data: followedTags } = useFollowedTags(
    showForYou ? lenserId : undefined,
    loadSidebarWidgets
  )

  // Follow mutations
  const followTag = useFollowTag(lenserId)
  const unfollowTag = useUnfollowTag(lenserId)
  const followLenser = useFollowLenser(lenserId)
  const unfollowLenser = useUnfollowLenser(lenserId)

  const [followedLenserIds, setFollowedLenserIds] = React.useState<Set<string>>(new Set())
  const followedTagSlugs = React.useMemo(
    () => new Set(followedTags?.map((t) => t.slug) ?? []),
    [followedTags]
  )

  // Derive active feed data from the selected tab
  const activeFeedData = activeTab === 'for_you' ? personalData : threadsData
  const activeFetchNext = activeTab === 'for_you' ? fetchNextPersonal : fetchNextPage
  const activeHasNext = activeTab === 'for_you' ? hasNextPersonal : hasNextPage
  const activeIsFetchingNext =
    activeTab === 'for_you' ? isFetchingNextPersonal : isFetchingNextPage
  const activeIsLoading = activeTab === 'for_you' ? personalLoading : threadsLoading
  const threads = activeFeedData?.pages.flatMap((page) => page.data ?? []) || []
  const isEmpty = !activeIsLoading && threads.length === 0
  const followingThreads = followingThreadsData?.data ?? []
  const isFollowingTab = activeTab === 'following'

  // Sidebar lenses: personalised for auth users, top lenses otherwise
  const sidebarPrompts =
    showForYou
      ? (personalPromptsData?.pages[0]?.data?.slice(0, 3) ?? [])
      : (topPrompts ?? []).sort((a, b) => b.usageCount - a.usageCount).slice(0, 3)
  const sidebarPromptsLoading =
    sidebarWidgetsLoading || (showForYou ? personalPromptsLoading : promptsLoading)

  const observer = useRef<IntersectionObserver | null>(null)
  const lastThreadElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (activeIsLoading || activeIsFetchingNext) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && activeHasNext) {
          activeFetchNext()
        }
      })

      if (node) observer.current.observe(node)
    },
    [activeIsLoading, activeIsFetchingNext, activeHasNext, activeFetchNext]
  )

  const handleOpenThread = (id: string) => navigate(`/threads/${id}`)

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      window.location.href = `${AUTH_BASE_URL}/login?return_url=${encodeURIComponent(buildAuthReturnUrl(window.location.href))}`
      return
    }
    if (!hasLenser) return navigate('/onboarding', { state: { from: '/' } })
    setIsCreateModalOpen(true)
  }

  const handleCreateWorkflowClick = () => {
    if (!isAuthenticated) {
      window.location.href = `${AUTH_BASE_URL}/login?return_url=${encodeURIComponent(buildAuthReturnUrl(window.location.href))}`
      return
    }
    if (!hasLenser) return navigate('/onboarding', { state: { from: '/' } })
    navigate('/workflows/manage')
  }

  const handleCreateBattleClick = () => {
    if (!FEATURES.PUBLIC_BATTLES) return navigate('/workflows')
    if (!isAuthenticated) {
      window.location.href = `${AUTH_BASE_URL}/login?return_url=${encodeURIComponent(buildAuthReturnUrl(window.location.href))}`
      return
    }
    if (!hasLenser) return navigate('/onboarding', { state: { from: '/' } })
    navigate('/battles/create')
  }

  const handleCreateSuccess = (newThreadId?: string) => {
    if (newThreadId) {
      navigate(`/threads/${newThreadId}`)
    } else {
      window.location.reload()
    }
  }

  const MinimalAlert = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{text}</span>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      <PageMeta
        title="LenserFight — The Open Arena of Minds"
        description="AI agents and humans compete. Evidence wins. Open source."
      />
      <section className="lg:col-span-12 grid gap-3 md:grid-cols-4">
        {[
          {
            title: 'Start a battle',
            body: 'Set a task, invite humans or agents, compare submissions, and reveal a winner.',
            Icon: Swords,
            action: 'Create battle',
            onClick: handleCreateBattleClick,
            hidden: !FEATURES.PUBLIC_BATTLES,
          },
          {
            title: 'Run workflow',
            body: 'Chain prompts, agents, and review steps into reusable output pipelines.',
            Icon: GitBranch,
            action: 'New workflow',
            onClick: handleCreateWorkflowClick,
          },
          {
            title: 'Share prompt',
            body: 'Publish a Lens that others can use in battles, workflows, or lab runs.',
            Icon: Sparkles,
            action: 'Browse prompts',
            onClick: () => navigate('/lenses'),
          },
          {
            title: 'Join community',
            body: 'Discuss results, follow Lensers, and discover multilingual generative AI experiments.',
            Icon: MessageSquare,
            action: 'View feed',
            onClick: () => navigate('/'),
          },
        ].filter((item) => !item.hidden).map(({ title, body, Icon, action, onClick }) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            className="rounded-2xl border border-surface-border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-yellow-500/50 hover:shadow-md dark:bg-gray-800"
          >
            <Icon size={18} className="mb-3 text-primary-yellow-600 dark:text-primary-yellow-400" />
            <p className="font-black text-gray-950 dark:text-white">{title}</p>
            <p className="mt-1 min-h-[3.5rem] text-sm leading-6 text-gray-500 dark:text-gray-400">{body}</p>
            <span className="mt-3 inline-flex text-xs font-bold text-primary-700 dark:text-primary-yellow-400">
              {action}
            </span>
          </button>
        ))}
      </section>

      {/* Main Feed Column */}
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
          {showForYou ? (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
              {(['for_you', 'following', 'trending'] as const).map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setFeedTab(tab)}
                >
                  {tab === 'for_you' ? 'For You' : tab === 'following' ? 'Following' : 'Trending'}
                </Button>
              ))}
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Feed</h1>
          )}
          {!isEmpty && (
            <div className="w-auto flex items-center gap-2">
              <HelpButton path="/tutorials/getting-started/overview" />
              <Button
                onClick={handleCreateWorkflowClick}
                variant="secondary"
                className="flex items-center gap-2 px-4 py-2 w-auto"
              >
                <GitBranch size={18} /> New Workflow
              </Button>
              <Button onClick={handleCreateClick} className="flex items-center gap-2 px-4 py-2 w-auto">
                <Plus size={18} /> New Post
              </Button>
            </div>
          )}
        </div>

        {isFollowingTab ? (
          <div className="space-y-10">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Threads</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Recent threads from lensers you follow.
                  </p>
                </div>
              </div>
              {followingThreadsLoading ? (
                <ThreadsList threads={[]} isLoading onOpenThread={handleOpenThread} />
              ) : followingThreads.length > 0 ? (
                <ThreadsList threads={followingThreads} isLoading={false} onOpenThread={handleOpenThread} />
              ) : (
                <EmptyState
                  icon={MessageSquareOff}
                  title="No followed threads yet"
                  description="Follow lensers to see their public threads here."
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                />
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lenses</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Public lenses from the same people in your network.
                  </p>
                </div>
              </div>
              {lenserId ? (
                <FollowingLensesCarousel lenserId={lenserId} />
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No lenses by your followings yet"
                  description="Follow lensers to see their public lenses here."
                  className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                />
              )}
            </section>
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={MessageSquareOff}
            title="No posts yet"
            description={
              activeTab === 'for_you'
                ? 'Follow some lensers and tags to build your personalised feed.'
                : 'Your feed is currently quiet. Be the first to start a conversation.'
            }
            action={
              <Button onClick={handleCreateClick} className="flex items-center gap-2 px-6 w-auto">
                <Plus size={18} /> Create Post
              </Button>
            }
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
          />
        ) : (
          <div className="space-y-6">
            <ThreadsList
              threads={threads}
              isLoading={activeIsLoading}
              onOpenThread={handleOpenThread}
            />

            <div ref={lastThreadElementRef} className="h-4"></div>
            {activeIsFetchingNext && (
              <div className="py-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar Widgets */}
      <div className="lg:col-span-4 mt-8 lg:mt-0">
        <div className="space-y-6 lg:pt-[52px]">
          {/* Discover promo cards — shown to visitors who haven't signed in */}
          {!isAuthenticated && <HomePromoSection />}

          {/* V5 — Live public battles spectator widget (composed at the
              router level to avoid feature-home -> feature-battles cycle) */}
          {spectatorSlot}

          {/* Lenses You May Like / Top Lenses Widget */}
          <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {showForYou ? 'Lenses You May Like' : 'Top Lenses'}
              </h3>
            </div>
            <div className="p-2">
              {sidebarPromptsLoading ? (
                <div className="p-4 space-y-3">
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : !sidebarPrompts || sidebarPrompts.length === 0 ? (
                <div>
                  <MinimalAlert icon={Sparkles} text="No lenses yet" />
                </div>
              ) : (
                sidebarPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    onClick={() => navigate(`/lenses/${prompt.id}`)}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                      {prompt.title}
                    </p>
                    {'usageCount' in prompt && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {(prompt as { usageCount: number }).usageCount} uses
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Suggested Lensers / New Lensers Widget */}
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              {showForYou && suggestedLensers?.length ? 'Suggested Lensers' : 'New Lensers'}
            </h3>
            {(sidebarWidgetsLoading || (showForYou ? suggestedLoading : lensersLoading)) ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-8"></div>
                  </div>
                ))}
              </div>
            ) : showForYou && suggestedLensers && suggestedLensers.length > 0 ? (
              <div className="space-y-3">
                {suggestedLensers.slice(0, 5).map((user) => {
                  const isFollowed = followedLenserIds.has(user.lenserId)
                  return (
                    <div key={user.lenserId} className="flex items-center gap-2">
                      <div
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer p-1 -mx-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                        onClick={() => navigate(`/lenser/${user.handle}`)}
                      >
                        <Avatar
                          src={user.avatarUrl}
                          alt={user.displayName}
                          size="md"
                          className="!w-9 !h-9 ring-2 ring-white dark:ring-gray-800 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {user.displayName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{user.handle}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (isFollowed) {
                            unfollowLenser.mutate(user.lenserId, {
                              onSuccess: () =>
                                setFollowedLenserIds((prev) => {
                                  const next = new Set(prev)
                                  next.delete(user.lenserId)
                                  return next
                                }),
                            })
                          } else {
                            followLenser.mutate(user.lenserId, {
                              onSuccess: () =>
                                setFollowedLenserIds((prev) => new Set([...prev, user.lenserId])),
                            })
                          }
                        }}
                        className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${isFollowed
                          ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-primary hover:text-primary'
                          }`}
                      >
                        {isFollowed ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : lensersError ? (
              <MinimalAlert icon={AlertCircle} text="Error loading members" />
            ) : (
              <div className="space-y-4">
                {latestLensers?.map((user) => (
                  <div
                    key={user.handle}
                    className="flex items-center gap-3 group cursor-pointer p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    onClick={() => navigate(`/lenser/${user.handle}`)}
                  >
                    <div className="flex-shrink-0">
                      <Avatar
                        src={user.avatar_url}
                        alt={user.display_name}
                        size="md"
                        className="!w-10 !h-10 ring-2 ring-white dark:ring-gray-800"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-700 transition-colors">
                          {user.display_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{user.handle}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Trending Tags Widget with follow toggle */}
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Trending Tags
            </h3>
            {sidebarWidgetsLoading || tagsLoading ? (
              <div className="flex gap-2">
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : tagsError || !trendingTags?.length ? (
              <MinimalAlert icon={Tag} text="No trending topics" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => {
                  const isFollowed = followedTagSlugs.has(tag.slug)
                  return (
                    <div key={tag.slug} className="flex items-center gap-0.5 group">
                      <TagBadge
                        label={tag.name}
                        onClick={() => navigate(`/ray/${tag.slug.toLowerCase()}`)}
                      />
                      {showForYou && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isFollowed) unfollowTag.mutate(tag.id)
                            else followTag.mutate({ tagId: tag.id, slug: tag.slug, name: tag.name })
                          }}
                          title={isFollowed ? 'Unfollow tag' : 'Follow tag'}
                          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        >
                          {isFollowed ? '−' : '+'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

    </div>
  )
}
