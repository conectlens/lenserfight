import { Plus, ChevronRight, MessageSquareOff, AlertCircle, Tag, Sparkles } from 'lucide-react'
import React, { useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { Avatar } from '../../../components/Avatar'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { SEOHead } from '../../../components/SEOHead'
import { TagBadge } from '../../../components/TagBadge'
import { useAuth } from '../../../context/AuthContext'
import { useLenser } from '../../../context/LenserContext'
import {
  useThreadsFeed,
  useTopPrompts,
  useTrendingTags,
  useLatestLensers,
} from '../../../hooks/useThreads'
import { CreateLenserProfileModal } from '../../onboarding/components/CreateLenserProfileModal'
import { CreateThreadModal } from '../../threads/components/CreateThreadModal'
import { ThreadsList } from '../components/ThreadsList'

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasLenser } = useLenser()
  const { isAuthenticated } = useAuth()

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false)

  const {
    data: threadsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: threadsLoading,
  } = useThreadsFeed()

  const { data: topPrompts, isLoading: promptsLoading } = useTopPrompts()
  const { data: trendingTags, isLoading: tagsLoading, isError: tagsError } = useTrendingTags()
  const {
    data: latestLensers,
    isLoading: lensersLoading,
    isError: lensersError,
  } = useLatestLensers()

  const threads = threadsData?.pages.flatMap((page) => page) || []
  const isEmpty = !threadsLoading && threads.length === 0

  const observer = useRef<IntersectionObserver | null>(null)
  const lastThreadElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (threadsLoading || isFetchingNextPage) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })

      if (node) observer.current.observe(node)
    },
    [threadsLoading, isFetchingNextPage, hasNextPage, fetchNextPage]
  )

  const handleOpenThread = (id: string) => navigate(`/threads/${id}`)

  const handleCreateClick = () => {
    if (!isAuthenticated) return navigate('/login', { state: { from: location } })
    if (!hasLenser) return setIsProfileModalOpen(true)
    setIsCreateModalOpen(true)
  }

  const handleCreateSuccess = (newThreadId?: string) => {
    if (newThreadId) {
      navigate(`/threads/${newThreadId}`)
    } else {
      window.location.reload()
    }
  }

  const MinimalAlert = ({ icon: Icon, text }: { icon: any; text: string }) => (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center">
      <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 mb-2" />
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{text}</span>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      <SEOHead type="home" />

      {/* Main Feed Column */}
      <div className="lg:col-span-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Feed</h1>
          {!isEmpty && (
            <div className="w-auto">
              <Button
                onClick={handleCreateClick}
                className="flex items-center gap-2 px-4 py-2 w-auto"
              >
                <Plus size={18} /> New Post
              </Button>
            </div>
          )}
        </div>

        {isEmpty ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 border-dashed p-10 py-16 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
              <MessageSquareOff size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No posts yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
              Your feed is currently quiet. Be the first to start a conversation.
            </p>
            <Button onClick={handleCreateClick} className="flex items-center gap-2 px-6 w-auto">
              <Plus size={18} /> Create Post
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <ThreadsList
              threads={threads}
              isLoading={threadsLoading}
              onOpenThread={handleOpenThread}
            />

            <div ref={lastThreadElementRef} className="h-4"></div>
            {isFetchingNextPage && (
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
          {/* Top Prompts Widget */}
          <Card className="p-0 overflow-hidden bg-white dark:bg-gray-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Top Prompts
              </h3>
            </div>
            <div className="p-2">
              {promptsLoading ? (
                <div className="p-4 space-y-3">
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              ) : !topPrompts || topPrompts.length === 0 ? (
                <div>
                  <MinimalAlert icon={Sparkles} text="No top prompts yet" />
                </div>
              ) : (
                [...topPrompts]
                  .sort((a, b) => b.usageCount - a.usageCount)
                  .map((prompt) => (
                    <div
                      key={prompt.id}
                      onClick={() => navigate(`/len/p/${prompt.id}`)}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                        {prompt.title}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {prompt.usageCount} uses
                      </p>
                    </div>
                  ))
              )}
            </div>
          </Card>

          {/* New Lensers Widget */}
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              New Lensers
            </h3>
            {lensersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded h-8"></div>
                  </div>
                ))}
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

          {/* Trending Tags Widget */}
          <Card className="p-6">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Trending Tags
            </h3>
            {tagsLoading ? (
              <div className="flex gap-2">
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : tagsError || !trendingTags?.length ? (
              <MinimalAlert icon={Tag} text="No trending topics" />
            ) : (
              <div className="flex flex-wrap gap-2">
                {trendingTags.map((tag) => (
                  <TagBadge
                    key={tag}
                    label={tag}
                    onClick={() => navigate(`/len/${tag.toLowerCase()}`)}
                  />
                ))}
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

      {isProfileModalOpen && (
        <CreateLenserProfileModal onClose={() => setIsProfileModalOpen(false)} />
      )}
    </div>
  )
}
