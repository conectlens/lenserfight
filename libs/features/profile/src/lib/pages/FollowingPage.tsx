import { lenserService } from '@lenserfight/data/repositories'
import { useToast } from '@lenserfight/shared/error'
import { FollowsNetworkUser } from '@lenserfight/types'
import { LocaleLink } from '@lenserfight/shared/i18n-routing'
import { Avatar } from '@lenserfight/ui/components'
import { Button } from '@lenserfight/ui/components'
import { ArrowLeft, Copy, UserX } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useLenser } from '../context/LenserContext'

const PAGE_SIZE = 20

export const FollowingPage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>()
  const navigate = useNavigate()
  const { toastError } = useToast()
  const { lenser: currentLenser } = useLenser()

  const [lenserId, setLenserId] = useState<string | null>(null)
  const [users, setUsers] = useState<FollowsNetworkUser[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [followingInProgress, setFollowingInProgress] = useState<Set<string>>(new Set())
  const observer = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!handle) return
    lenserService
      .getLenserByHandle(handle)
      .then((profile) => profile && setLenserId(profile.id))
      .catch((err) => toastError(err, { redirectOnAuth: true, navigate }))
  }, [handle])

  const loadUsers = useCallback(
    async (currentOffset: number, reset = false) => {
      if (!lenserId) return
      setLoading(true)
      try {
        const result = await lenserService.getLenserFollows(lenserId, 'following', currentOffset, PAGE_SIZE)
        const newUsers = result.data ?? []
        setUsers((prev) => (reset ? newUsers : [...prev, ...newUsers]))
        setHasMore(newUsers.length >= PAGE_SIZE)
      } catch (err) {
        toastError(err, { redirectOnAuth: true, navigate })
      } finally {
        setLoading(false)
      }
    },
    [lenserId]
  )

  useEffect(() => {
    if (!lenserId) return
    setUsers([])
    setOffset(0)
    setHasMore(true)
    loadUsers(0, true)
  }, [lenserId])

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

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/lenser/${handle}`)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Following{handle ? ` by @${handle}` : ''}
        </h1>
      </div>

      <div className="space-y-0 divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {users.map((user, index) => (
          <div
            key={user.lenserId}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <LocaleLink
              to={`/lenser/${user.handle}`}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0"
            >
              <Avatar src={user.avatarUrl} size="md" className="!w-10 !h-10 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
              </div>
            </LocaleLink>
            {user.lenserId !== currentLenser?.id && (
              <Button
                size="sm"
                variant={user.isFollowing ? 'secondary' : 'primary'}
                onClick={() => handleFollowToggle(user)}
                disabled={followingInProgress.has(user.lenserId)}
                className="!w-auto rounded-full flex-shrink-0 ml-3"
              >
                {user.isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
            {index === users.length - 1 && <div ref={lastElementRef} />}
          </div>
        ))}

        {loading && (
          <div className="px-4 py-3 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 w-28 rounded" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && users.length === 0 && !hasMore && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600">
              <UserX size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-gray-700 dark:text-gray-200 font-semibold text-sm">Not following anyone yet</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs max-w-[220px]">
                Share your profile to grow your network
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="!w-auto flex items-center gap-1.5"
              onClick={() => {
                const url = `${window.location.origin}/lenser/${handle}`
                navigator.clipboard.writeText(url).catch(() => undefined)
              }}
            >
              <Copy size={13} /> Copy profile link
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
