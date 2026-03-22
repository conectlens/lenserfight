import { UserX, Sparkles } from 'lucide-react'
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'

import { Avatar } from '@lenserfight/ui/components'
import { Modal } from '@lenserfight/ui/modals'
import { lenserService } from '@lenserfight/data/repositories'
import { FollowsNetworkUser, TrendingLenser } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'
import { useLenser } from '../context/LenserContext'

const PAGE_SIZE = 20

interface NetworkModalProps {
  isOpen: boolean
  onClose: () => void
  lenserId: string
  type: 'followers' | 'following'
  currentLenserId?: string
}

export const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  onClose,
  lenserId,
  type,
  currentLenserId,
}) => {
  const navigate = useNavigate()
  const { toastError, toastInfo } = useToast()
  const { hasLenser } = useLenser()
  const [users, setUsers] = useState<FollowsNetworkUser[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set())
  const [trendingLensers, setTrendingLensers] = useState<TrendingLenser[]>([])
  const [loadingTrending, setLoadingTrending] = useState(false)
  const observer = useRef<IntersectionObserver | null>(null)

  const loadUsers = useCallback(
    async (currentOffset: number, reset = false) => {
      if (!lenserId) return
      setLoading(true)
      try {
        const result = await lenserService.getLenserFollows(lenserId, type, currentOffset, PAGE_SIZE)
        const newUsers = result.data ?? []
        setUsers((prev) => (reset ? newUsers : [...prev, ...newUsers]))
        setHasMore(newUsers.length >= PAGE_SIZE)
      } catch (err) {
        toastError(err, { redirectOnAuth: true, navigate })
      } finally {
        setLoading(false)
      }
    },
    [lenserId, type]
  )

  useEffect(() => {
    if (isOpen) {
      setUsers([])
      setOffset(0)
      setHasMore(true)
      setTrendingLensers([])
      loadUsers(0, true)
    }
  }, [isOpen, lenserId, type])

  // Load trending lensers when list is empty and done loading
  useEffect(() => {
    if (!loading && !hasMore && users.length === 0) {
      setLoadingTrending(true)
      lenserService
        .getTrendingLensers(10)
        .then((lensers) => setTrendingLensers(lensers))
        .catch((err) => toastError(err, { redirectOnAuth: true, navigate }))
        .finally(() => setLoadingTrending(false))
    }
  }, [loading, hasMore, users.length])

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextOffset = offset + PAGE_SIZE
          setOffset(nextOffset)
          loadUsers(nextOffset)
        }
      })

      if (node) observer.current.observe(node)
    },
    [loading, hasMore, offset, loadUsers]
  )

  const handleFollowToggle = async (user: FollowsNetworkUser) => {
    if (!hasLenser) {
      toastInfo('Sign in and set up your profile to follow lensers.')
      return
    }
    if (followingInProgress.has(user.lenserId)) return
    setFollowingInProgress((prev) => new Set(prev).add(user.lenserId))
    try {
      if (user.isFollowing) {
        await lenserService.unfollowLenser(user.lenserId)
      } else {
        await lenserService.followLenser(user.lenserId)
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.lenserId === user.lenserId ? { ...u, isFollowing: !u.isFollowing } : u
        )
      )
    } catch (err) {
      toastError(err, { redirectOnAuth: true, navigate })
    } finally {
      setFollowingInProgress((prev) => {
        const next = new Set(prev)
        next.delete(user.lenserId)
        return next
      })
    }
  }

  const handleTrendingFollow = async (lenser: TrendingLenser) => {
    if (!hasLenser) {
      toastInfo('Sign in and set up your profile to follow lensers.')
      return
    }
    if (followingInProgress.has(lenser.lenserId)) return
    setFollowingInProgress((prev) => new Set(prev).add(lenser.lenserId))
    try {
      await lenserService.followLenser(lenser.lenserId)
      setTrendingLensers((prev) =>
        prev.map((l) => (l.lenserId === lenser.lenserId ? { ...l, _following: true } : l))
      )
    } catch (err) {
      toastError(err, { redirectOnAuth: true, navigate })
    } finally {
      setFollowingInProgress((prev) => {
        const next = new Set(prev)
        next.delete(lenser.lenserId)
        return next
      })
    }
  }

  const title = type === 'followers' ? 'Followers' : 'Following'

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="-mx-6 px-6">
        {users.map((user, index) => (
          <div
            key={user.lenserId}
            className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0 dark:text-gray-200"
          >
            <Link
              to={`/lenser/${user.handle}`}
              onClick={onClose}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Avatar src={user.avatarUrl} size="md" className="!w-10 !h-10" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">@{user.handle}</p>
              </div>
            </Link>
            {user.lenserId !== currentLenserId && (
              <button
                onClick={() => handleFollowToggle(user)}
                disabled={followingInProgress.has(user.lenserId)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
                  user.isFollowing
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-primary text-gray-900 hover:bg-yellow-300'
                }`}
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
            {index === users.length - 1 && <div ref={lastElementRef} />}
          </div>
        ))}

        {loading && (
          <div className="space-y-3 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 w-24 rounded"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 w-16 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && !hasMore && (
          <>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-gray-600">
                <UserX size={24} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                No {type} found.
              </p>
            </div>

            {(trendingLensers.length > 0 || loadingTrending) && (
              <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Sparkles size={13} />
                  <span>Discover popular Lensers</span>
                </div>
                {loadingTrending ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 w-24 rounded"></div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 w-16 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  trendingLensers
                    .filter((l) => l.lenserId !== currentLenserId)
                    .map((lenser) => {
                      const isFollowing = !!(lenser as any)._following
                      return (
                        <div
                          key={lenser.lenserId}
                          className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
                        >
                          <Link
                            to={`/lenser/${lenser.handle}`}
                            onClick={onClose}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                          >
                            <Avatar
                              src={lenser.avatarUrl}
                              size="md"
                              className="!w-10 !h-10"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {lenser.displayName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                @{lenser.handle}
                              </p>
                            </div>
                          </Link>
                          {!isFollowing && (
                            <button
                              onClick={() => handleTrendingFollow(lenser)}
                              disabled={followingInProgress.has(lenser.lenserId)}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-gray-900 hover:bg-yellow-300 transition-colors disabled:opacity-50"
                            >
                              Follow
                            </button>
                          )}
                        </div>
                      )
                    })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
