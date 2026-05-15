
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService, socialLinksService, xpService } from '@lenserfight/data/repositories'
import { Lenser, LenserBadge, LenserStats, SocialLink, RelationshipState } from '@lenserfight/types'
import { XPSummary } from '@lenserfight/types'
import { Avatar, Badge, Button, HelpButton } from '@lenserfight/ui/components'
import { FEATURES } from '@lenserfight/utils/env'
import { formatCount } from '@lenserfight/utils/number'
import {
  Camera,
  Pencil,
  Globe,
  Lock,
  Users,
  Link as LinkIcon,
  Linkedin,
  Github,
  Twitter,
  Instagram,
  Facebook,
  Youtube,
  Trophy,
  Zap,
  Bot,
  LayoutDashboard,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import React, { useState, useEffect } from 'react'

import { useLenser } from '../context/LenserContext'

import { AvatarSelectionModal } from './AvatarSelectionModal'
import { BannerSelectionModal } from './BannerSelectionModal'
import { EditProfileModal } from './EditProfileModal'
import { FollowButton } from './FollowButton'
import { NetworkModal } from './NetworkModal'

interface LenserProfileHeaderProps {
  lenser: Lenser & { visibility?: 'public' | 'private' | 'community' }
  stats: LenserStats | null
  xpSummary?: XPSummary | null
  isOwner: boolean
  onProfileUpdate: (updatedLenser: Lenser) => void
  relationshipState?: RelationshipState | null
  onManageAgents?: () => void
  onEditAgent?: () => void
  onControlRoom?: () => void
  /** agents.ai_lensers.id — required for AI profiles so fn_update_agent_profile receives the correct ID */
  agentLenserId?: string
}

export const LenserProfileHeader: React.FC<LenserProfileHeaderProps> = ({
  lenser,
  stats,
  xpSummary,
  isOwner,
  onProfileUpdate,
  relationshipState,
  onManageAgents,
  onEditAgent,
  onControlRoom,
  agentLenserId,
}) => {
  const { updateLenserProfile } = useLenser()

  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showBannerModal, setShowBannerModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  const [networkType, setNetworkType] = useState<'followers' | 'following' | null>(null)

  const FOUNDING_TYPES = new Set([
    'founding_10', 'founding_100', 'founding_1000',
    'prestige_first_10', 'prestige_first_100', 'prestige_first_1000',
  ])

  const { data: allBadges = [] } = useQuery<LenserBadge[]>({
    queryKey: queryKeys.xp.badges(lenser.id),
    queryFn: () => xpService.getBadges(lenser.id),
    staleTime: 1000 * 60 * 5,
    enabled: !!lenser.id,
  })

  const foundingBadges = allBadges.filter((b) => FOUNDING_TYPES.has(b.type.toLowerCase()))

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const links = await socialLinksService.getLinksByHandle(lenser.handle)
        setSocialLinks(links)
      } catch (e) {
        console.error(e)
      }
    }
    fetchLinks()
  }, [lenser.handle])

  const handleEditClose = async () => {
    setShowEditModal(false)
    const links = await socialLinksService.getLinksByHandle(lenser.handle)
    setSocialLinks(links)
  }

  const handleUpdate = async (data: Partial<Lenser>) => {
    if (!isOwner) return
    setIsUpdating(true)
    try {
      let updated: Lenser
      if (lenser.type === 'ai') {
        // AI agent profiles are edited via the secure ownership-checked RPC
        await agentsService.updateAgentProfile(agentLenserId ?? lenser.id, {
          display_name: data.display_name,
          avatar_url: data.avatar_url,
          banner_url: data.banner_url,
          bio: data.bio,
          headline: data.headline,
          website_url: data.website_url,
        })
        // Merge patch into local profile state (no separate fetch needed)
        updated = { ...lenser, ...data }
      } else {
        updated = await updateLenserProfile(data)
      }
      onProfileUpdate(updated)
      setShowAvatarModal(false)
      setShowBannerModal(false)
      setShowEditModal(false)

      const links = await socialLinksService.getLinksByHandle(lenser.handle)
      setSocialLinks(links)
    } catch (e) {
      console.error('Failed to update profile', e)
      alert('Failed to update profile. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const followersCount = stats?.followersCount || 0
  const followingCount = stats?.followingCount || 0

  const { lenser: currentUser } = useLenser()

  const StatsBlock = ({ mobile = false }) => (
    <div
      className={`flex items-center gap-3 text-sm ${mobile ? 'justify-center text-gray-600 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}
    >
      <div
        className="flex items-center gap-1 transition-colors group/stats cursor-pointer hover:text-primary-700 dark:hover:text-primary-400"
        onClick={() => setNetworkType('followers')}
      >
        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover/stats:text-primary-700 dark:group-hover/stats:text-primary-400">
          {formatCount(followersCount)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">Followers</span>
      </div>
      <span className="text-gray-300 dark:text-gray-600">•</span>
      <div
        className="flex items-center gap-1 transition-colors group/stats cursor-pointer hover:text-primary-700 dark:hover:text-primary-400"
        onClick={() => setNetworkType('following')}
      >
        <span className="font-bold text-gray-900 dark:text-gray-100 group-hover/stats:text-primary-700 dark:group-hover/stats:text-primary-400">
          {formatCount(followingCount)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">Following</span>
      </div>

      {xpSummary && (
        <>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
            <Zap size={14} className="fill-current" />
            <span>{formatCount(xpSummary.totalXp)} XP</span>
          </div>
        </>
      )}

      {!mobile && (
        <>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-500 dark:text-gray-400 font-medium">@{lenser.handle}</span>
        </>
      )}
    </div>
  )

  const getWebsiteLabel = () => {
    if (lenser.website_display_name) {
      return lenser.website_display_name.replace(/^https?:\/\//, '').replace(/\/$/, '')
    }
    return lenser.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Website'
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'LinkedIn':
        return <Linkedin size={18} />
      case 'GitHub':
        return <Github size={18} />
      case 'X':
        return <Twitter size={18} />
      case 'Instagram':
        return <Instagram size={18} />
      case 'Facebook':
        return <Facebook size={18} />
      case 'Youtube':
        return <Youtube size={18} />
      default:
        return <LinkIcon size={18} />
    }
  }

  return (
    <div className="relative mb-6 md:mb-8">
      {/* Banner Area */}
      <div className="h-32 md:h-64 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative z-0 group">
        {lenser.banner_url ? (
          <img
            src={lenser.banner_url}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
        ) : lenser.type === 'ai' && !lenser.banner_url ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-gray-900 to-yellow-950/40 dark:from-gray-950 dark:via-indigo-950 dark:to-gray-900 flex items-end justify-center gap-4 px-6 pb-0 overflow-hidden">
            <img src="https://cdn.lenserfight.com/brand/lensers/LOLA_DNA.png" alt="LOLA" className="h-24 md:h-44 object-contain hover:scale-105 transition-transform duration-300" />
            <img src="https://cdn.lenserfight.com/brand/lensers/LENSE_DNA.png" alt="LENSE" className="h-24 md:h-44 object-contain hover:scale-105 transition-transform duration-300" />
            <img src="https://cdn.lenserfight.com/brand/lensers/LENSA_DNA.png" alt="LENSA" className="h-24 md:h-44 object-contain opacity-75 -rotate-3 hover:rotate-0 hover:opacity-100 transition-all duration-300" />
            <img src="https://cdn.lenserfight.com/brand/lensers/LENSO_DNA.png" alt="LENSO" className="h-24 md:h-44 object-contain opacity-75 rotate-3 hover:rotate-0 hover:opacity-100 transition-all duration-300" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-600 opacity-60 text-4xl md:text-6xl font-black tracking-tighter">
              LENSER
            </span>
          </div>
        )}

        {isOwner && (
          <button
            onClick={() => setShowBannerModal(true)}
            className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
            title="Change Header Image"
          >
            <Camera size={20} />
          </button>
        )}
      </div>

      {/* Profile Info Card Overlay */}
      <div className="px-0 md:px-6 relative z-10 -mt-6 md:-mt-16">
        <div className="bg-white dark:bg-gray-800 md:rounded-2xl shadow-sm border-b md:border border-gray-100 dark:border-gray-700 p-6 md:p-8 relative transition-colors">
          {/* Mobile Edit / Follow Button */}
          {isOwner ? (
            <div className="md:hidden absolute top-4 right-4 flex gap-2 z-20">
              <Button
                variant="ghost"
                onClick={() => setShowEditModal(true)}
                className="!p-2.5 !w-auto rounded-full"
                title="Edit Profile"
              >
                <Pencil size={18} />
              </Button>
              {lenser.type === 'ai' && onEditAgent && (
                <Button
                  variant="ghost"
                  onClick={onEditAgent}
                  className="!p-2.5 !w-auto rounded-full"
                  title="Edit Agent Details"
                >
                  <Bot size={18} />
                </Button>
              )}
              {lenser.type === 'ai' && onControlRoom && (
                <Button
                  variant="ghost"
                  onClick={onControlRoom}
                  className="!p-2.5 !w-auto rounded-full"
                  title="Control Room"
                >
                  <LayoutDashboard size={18} />
                </Button>
              )}
            </div>
          ) : (
            <div className="md:hidden absolute top-4 right-4 z-20">
              <FollowButton
                targetProfileId={lenser.id}
                handle={lenser.handle}
                relationshipState={relationshipState ?? null}
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 -mt-16 md:-mt-20 relative group/avatar">
              <div className="relative rounded-full">
                <Avatar
                  src={lenser.avatar_url}
                  alt={lenser.display_name}
                  className="!w-28 !h-28 md:!w-40 md:!h-40 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-white dark:bg-gray-700 transition-colors"
                />

                {/* Join Order Badge (Avatar Version - Keep as simple indicator) */}
                {lenser.join_order !== undefined && (
                  <div
                    className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 z-20 bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 border-[3px] border-white dark:border-gray-800 shadow-lg px-3 py-1 rounded-full flex items-center justify-center transform transition-transform hover:scale-105 hover:rotate-2 cursor-default group/badge"
                    title={`Member #${lenser.join_order}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-black text-yellow-950 tracking-tight leading-none font-mono">
                        #{lenser.join_order}
                      </span>
                    </div>
                  </div>
                )}

                {/* Level Badge (Left) */}
                {xpSummary && (
                  <div
                    className="absolute -bottom-1 -left-1 md:bottom-1 md:left-1 z-20 bg-white dark:bg-gray-800 border-[3px] border-white dark:border-gray-800 shadow-lg px-2.5 py-1 rounded-full flex items-center justify-center cursor-default transform transition-transform hover:scale-105"
                    title={`Level ${xpSummary.currentLevel} • ${xpSummary.totalXp} XP`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1 rounded-full text-indigo-600 dark:text-indigo-400">
                        <Trophy size={10} className="fill-current" />
                      </div>
                      <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-black text-gray-900 dark:text-white tracking-tight">
                          LVL {xpSummary.currentLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {isOwner && (
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px] z-10"
                    title="Change Avatar"
                  >
                    <Camera size={32} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1 min-w-0 w-full flex flex-col items-center md:items-start text-center md:text-left">
              {/* Desktop: Stats Row Top */}
              <div className="hidden md:block mb-1">
                <StatsBlock />
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full mb-1">
                <div className="flex flex-col gap-1 w-full md:w-auto items-center md:items-start">
                  <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                      {lenser.display_name}
                    </h1>
                    {lenser.type === 'ai' && (
                      <Badge color="gray">AI Lenser</Badge>
                    )}
                    {lenser.visibility === 'private' && (
                      <span title="Private profile" className="flex items-center text-gray-400 dark:text-gray-500">
                        <Lock size={16} />
                      </span>
                    )}
                    {lenser.visibility === 'community' && (
                      <span title="Community profile" className="flex items-center text-blue-400 dark:text-blue-500">
                        <Users size={16} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:hidden mt-1">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      @{lenser.handle}
                    </p>
                    {lenser.join_order !== undefined && (
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 font-mono">
                        #{lenser.join_order}
                      </span>
                    )}
                  </div>
                  <p className="hidden md:block text-gray-500 dark:text-gray-400 text-sm font-medium opacity-0 h-0 w-0 overflow-hidden">
                    @{lenser.handle}
                  </p>{' '}
                  {/* Hidden on desktop as it's in stats block */}
                </div>

                {isOwner ? (
                  <div className="hidden md:flex items-center gap-2 mt-2 md:mt-0">
                    {FEATURES.AGENTS && onManageAgents && (
                      <Button
                        variant="secondary"
                        onClick={onManageAgents}
                        title="Manage AI Agents"
                        className="flex items-center gap-2 w-auto"
                      >
                        <Bot size={16} />
                        Agents
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 w-auto"
                    >
                      <Pencil size={16} />
                      Edit Profile
                    </Button>
                    {lenser.type === 'ai' && onEditAgent && (
                      <Button
                        variant="secondary"
                        onClick={onEditAgent}
                        className="flex items-center gap-2 w-auto"
                        title="Edit Agent Details"
                      >
                        <Bot size={16} />
                        Edit Agent
                      </Button>
                    )}
                    {lenser.type === 'ai' && onControlRoom && (
                      <Button
                        variant="secondary"
                        onClick={onControlRoom}
                        className="flex items-center gap-2 w-auto"
                        title="Open Control Room"
                      >
                        <LayoutDashboard size={16} />
                        Control Room
                      </Button>
                    )}
                    {lenser.type !== 'ai' && (
                      <HelpButton path="/explanation/lensers/human-lensers" label="About Lensers" />
                    )}
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-2 mt-2 md:mt-0">
                    <FollowButton
                      targetProfileId={lenser.id}
                      handle={lenser.handle}
                      relationshipState={relationshipState ?? null}
                    />
                    {lenser.type !== 'ai' && (
                      <HelpButton path="/explanation/lensers/human-lensers" label="About Lensers" />
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: Stats */}
              <div className="md:hidden w-full mb-4 mt-2">
                <StatsBlock mobile />
              </div>

              <div className="w-full h-px bg-gray-100 dark:bg-gray-700 my-2 md:hidden"></div>

              <div className="flex flex-col gap-2 mb-3 md:mb-4 w-full">
                {lenser.headline && (
                  <p className="font-medium text-gray-800 dark:text-gray-200 mt-2 md:mt-0">
                    {lenser.headline}
                  </p>
                )}

                {lenser.bio && (
                  <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl whitespace-pre-wrap">
                    {lenser.bio}
                  </p>
                )}

                {foundingBadges.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mt-1">
                    {foundingBadges.map((badge) => (
                      <span
                        key={badge.id}
                        title={badge.description ?? badge.label}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700"
                      >
                        {badge.icon && <span className="text-sm leading-none">{badge.icon}</span>}
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                  {lenser.website_url && (
                    <a
                      href={lenser.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <Globe size={14} />
                      {getWebsiteLabel()}
                    </a>
                  )}

                  {/* Social Links Row */}
                  {socialLinks.length > 0 && (
                    <div className="flex items-center gap-3">
                      {lenser.website_url && (
                        <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
                      )}
                      {socialLinks.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1 -m-1"
                          title={link.label || link.platform}
                        >
                          {getPlatformIcon(link.platform)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOwner && (
        <>
          <AvatarSelectionModal
            isOpen={showAvatarModal}
            onClose={() => setShowAvatarModal(false)}
            onSelect={(url) => handleUpdate({ avatar_url: url })}
            isLoading={isUpdating}
            currentUrl={lenser.avatar_url}
            lenserType={lenser.type === 'ai' ? 'ai' : 'human'}
          />
          <BannerSelectionModal
            isOpen={showBannerModal}
            onClose={() => setShowBannerModal(false)}
            onSelect={(url) => handleUpdate({ banner_url: url })}
            isLoading={isUpdating}
            currentUrl={lenser.banner_url}
          />
          <EditProfileModal
            isOpen={showEditModal}
            onClose={handleEditClose}
            onSave={(data) => handleUpdate(data)}
            currentData={lenser}
            isLoading={isUpdating}
          />
        </>
      )}

      {networkType && (
        <NetworkModal
          isOpen={!!networkType}
          onClose={() => setNetworkType(null)}
          type={networkType}
          lenserId={lenser.id}
          currentLenserId={currentUser?.id}
        />
      )}
    </div>
  )
}
