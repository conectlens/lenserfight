import { feedbackService, lenserService, socialLinksService } from '@lenserfight/data/repositories'
import { useNotifications } from '@lenserfight/features/notifications'
import { useAuth } from '@lenserfight/features/auth'
import { InputField, SelectField } from '@lenserfight/ui/forms'
import { useWallet } from '@lenserfight/features/store'
import { AvatarSelectionModal, useLenser } from '@lenserfight/features/profile'
import { Feedback, ProductTag, FeedbackStatus, SocialLink, SocialPlatform } from '@lenserfight/types'
import { Avatar, Button, Card, DangerZone, HelpButton, Table, Column } from '@lenserfight/ui/components'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { timeAgo } from '@lenserfight/utils/date'
import { FEATURES, WEB_BASE_URL } from '@lenserfight/utils/env'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Check, Camera, Eye, Lock, MessageSquareDashed, Coins, ImageIcon, Plus, Trash2, Github, Linkedin, Facebook, Instagram, Twitter, Youtube } from 'lucide-react'
import { AgentsTab } from '../components/AgentsTab'
import { ApiKeysTab } from '../components/ApiKeysTab'
import { GeneralTab } from '../components/GeneralTab'
import { PartnerAccountsTab } from '../components/PartnerAccountsTab'
import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, Link, useParams, useNavigate } from 'react-router-dom'

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string }[] = [
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'GitHub', label: 'GitHub' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Youtube', label: 'YouTube' },
]

const SOCIAL_URL_VALIDATORS: Record<string, { regex: RegExp; placeholder: string; example: string }> = {
  LinkedIn: { regex: /^https:\/\/(www\.)?linkedin\.com\/in\/.+/, placeholder: 'https://linkedin.com/in/username', example: 'https://linkedin.com/in/johndoe' },
  GitHub:   { regex: /^https:\/\/(www\.)?github\.com\/.+/,   placeholder: 'https://github.com/username',       example: 'https://github.com/johndoe' },
  X:        { regex: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/.+/, placeholder: 'https://x.com/username',   example: 'https://x.com/johndoe' },
  Instagram:{ regex: /^https:\/\/(www\.)?instagram\.com\/.+/, placeholder: 'https://instagram.com/username',  example: 'https://instagram.com/johndoe' },
  Facebook: { regex: /^https:\/\/(www\.)?facebook\.com\/.+/, placeholder: 'https://facebook.com/username',    example: 'https://facebook.com/johndoe' },
  Youtube:  { regex: /^https:\/\/(www\.)?youtube\.com\/.+/,  placeholder: 'https://youtube.com/@channel',    example: 'https://youtube.com/@johndoe' },
}

const FEEDBACK_PAGE_SIZE = 5

const getTagLabel = (tag: ProductTag) => {
  const map: Record<ProductTag, string> = {
    bug: 'Bug',
    feature: 'Feature Request',
    ui_ux: 'UI/UX',
    general: 'General',
    other: 'Other',
  }
  return map[tag] || tag
}

const getStatusBadge = (status: FeedbackStatus) => {
  switch (status) {
    case 'pending':
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800">
          Pending
        </span>
      )
    case 'reviewed':
    case 'in_progress': // Handle potential variations
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
          In Progress
        </span>
      )
    case 'resolved':
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
          Resolved
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          Closed
        </span>
      )
    default:
      return (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          {status}
        </span>
      )
  }
}

export const SettingsPage: React.FC = () => {
  const { tab } = useParams<{ tab: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { lenser, updateLenserProfile } = useLenser()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location } })
    }
  }, [authLoading, isAuthenticated, navigate, location])

  // Tab Logic
  const validTabs = useMemo(() => {
    const tabs = ['account', 'profile', 'api-keys', 'general']
    if (lenser?.type === 'human') {
      tabs.push('agents')
    }
    tabs.push('notifications')
    tabs.push('connected-accounts')
    return tabs
  }, [lenser?.type])

  const tabLabel = (t: string) => {
    if (t === 'api-keys') return 'API Keys'
    if (t === 'agents') return 'Agents'
    if (t === 'connected-accounts') return 'Connected Accounts'
    return t.charAt(0).toUpperCase() + t.slice(1)
  }

  const activeTab = validTabs.includes(tab?.toLowerCase() || '') ? tab?.toLowerCase() : 'account'

  // Redirect invalid tabs to account
  useEffect(() => {
    if (!authLoading && isAuthenticated && tab && !validTabs.includes(tab.toLowerCase())) {
      navigate('/settings/account', { replace: true })
    }
  }, [tab, authLoading, isAuthenticated, navigate, validTabs])

  // Profile Form State
  const [formData, setFormData] = useState({
    displayName: '',
    handle: '',
    bio: '',
    headline: '',
    location: '',
    websiteUrl: '',
    visibility: 'public' as 'public' | 'private' | 'community',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [websiteError, setWebsiteError] = useState<string | null>(null)

  // Social Links State
  const [socialLinks, setSocialLinks] = useState<Partial<SocialLink>[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [linkErrors, setLinkErrors] = useState<Record<number, string>>({})
  const isMounted = useRef(true)
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false } }, [])
  // Notifications State
  const { notifications, isLoading: notifLoading, markAllRead } = useNotifications(50)
  const [notifTab, setNotifTab] = useState<'All' | 'Unread'>('All')

  // Deletion State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Feedbacks State (React Query)
  const [feedbackPage, setFeedbackPage] = useState(1)
  const { data: feedbackData, isLoading: feedbackLoading } = useQuery({
    queryKey: ['feedbacks', user?.id, feedbackPage],
    queryFn: () =>
      user?.id
        ? feedbackService.getUserFeedbacks(feedbackPage, FEEDBACK_PAGE_SIZE)
        : { data: [], total: 0 },
    enabled: !!user?.id && activeTab === 'account',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const { balance: walletBalance } = useWallet()

  useEffect(() => {
    if (lenser) {
      setFormData({
        displayName: lenser.display_name || '',
        handle: lenser.handle || '',
        bio: lenser.bio || '',
        headline: lenser.headline || '',
        location: lenser.location || '',
        websiteUrl: lenser.website_url || '',
        visibility: lenser.visibility || 'public',
      })
    }
  }, [lenser])

  useEffect(() => {
    if (activeTab !== 'profile' || !lenser?.handle) return
    setLoadingLinks(true)
    socialLinksService.getLinks(lenser.handle)
      .then((links) => { if (isMounted.current) setSocialLinks(links.filter((l) => l.platform !== 'Other')) })
      .catch(() => {})
      .finally(() => { if (isMounted.current) setLoadingLinks(false) })
  }, [activeTab, lenser?.handle])

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const getAvailablePlatforms = (currentIndex: number) => {
    const used = socialLinks.map((l, i) => (i === currentIndex ? null : l.platform)).filter(Boolean)
    return SOCIAL_PLATFORMS.filter((p) => !used.includes(p.value))
  }

  const handleAddLink = () => {
    const available = getAvailablePlatforms(-1)
    if (available.length === 0) return
    setSocialLinks([...socialLinks, { platform: available[0].value, url: '', label: '' }])
  }

  const handleRemoveLink = (index: number) => {
    const updated = [...socialLinks]
    updated.splice(index, 1)
    setSocialLinks(updated)
    const errs = { ...linkErrors }
    delete errs[index]
    setLinkErrors(errs)
  }

  const handleLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...socialLinks]
    updated[index] = { ...updated[index], [field]: value }
    setSocialLinks(updated)
    if (field === 'url') {
      const errs = { ...linkErrors }
      delete errs[index]
      setLinkErrors(errs)
    }
  }

  const handleProfileSave = async () => {
    if (!lenser) return
    setWebsiteError(null)
    setLinkErrors({})

    const trimmedUrl = formData.websiteUrl.trim()
    if (trimmedUrl && !/^https?:\/\/.+/.test(trimmedUrl)) {
      setWebsiteError('Must start with http:// or https://')
      return
    }

    const errors: Record<number, string> = {}
    socialLinks.forEach((link, i) => {
      if (!link.url?.trim()) { errors[i] = 'URL is required'; return }
      const v = SOCIAL_URL_VALIDATORS[link.platform!]
      if (v && !v.regex.test(link.url)) errors[i] = `Invalid format. Example: ${v.example}`
    })
    if (Object.keys(errors).length) { setLinkErrors(errors); return }

    setIsSaving(true)
    try {
      await socialLinksService.syncLinks(lenser.handle, socialLinks as any)
      await updateLenserProfile({
        display_name: formData.displayName,
        bio: formData.bio,
        headline: formData.headline,
        location: formData.location,
        website_url: trimmedUrl || undefined,
        visibility: formData.visibility,
      })
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAvatarUpdate = async (url: string | null) => {
    if (!lenser) return
    setIsSaving(true)
    try {
      await updateLenserProfile({ avatar_url: url })
      setShowAvatarModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRequest = async () => {
    if (!lenser) return
    setIsDeleting(true)
    try {
      const result = await lenserService.scheduleAccountDeletion()
      await logout()
      navigate('/auth/login')
      alert(result.deadline
        ? `Account scheduled for deletion. You have until ${new Date(result.deadline).toLocaleDateString()} to cancel by signing back in.`
        : 'Account deletion scheduled. Sign back in within 30 days to cancel.'
      )
    } catch (e) {
      console.error('Failed to schedule deletion', e)
      alert('Failed to process deletion request.')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  // Filter Notifications
  const filteredNotifications = notifications.filter((n) => {
    if (notifTab === 'Unread') return !n.read_at
    return true
  })

  // Table Columns for Feedback
  const feedbackColumns: Column<Feedback>[] = [
    {
      header: '#',
      render: (_, index) => (
        <span className="text-gray-400 font-mono text-xs">
          {(feedbackPage - 1) * FEEDBACK_PAGE_SIZE + index + 1}
        </span>
      ),
      className: 'w-12',
    },
    {
      header: 'Product Tag',
      accessor: 'product_tag',
      render: (item) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${item.product_tag === 'bug'
            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800'
            : item.product_tag === 'feature'
              ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
            }`}
        >
          {getTagLabel(item.product_tag)}
        </span>
      ),
    },
    {
      header: 'Message',
      accessor: 'message',
      render: (item) => (
        <span
          className="block truncate max-w-[200px] md:max-w-xs text-gray-600 dark:text-gray-300"
          title={item.message || ''}
        >
          {item.message}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (item) => getStatusBadge(item.status),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (item) => (
        <span className="text-gray-500 dark:text-gray-400 text-xs">
          {new Date(item.created_at).toLocaleDateString()}
        </span>
      ),
      className: 'text-right',
    },
  ]

  if (authLoading || !isAuthenticated) {
    return null
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Settings</h1>

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          {validTabs.map((t) => (
            <button
              key={t}
              onClick={() => navigate(`/settings/${t}`)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              {tabLabel(t)}
            </button>
          ))}

          {/* External Link Style Tabs */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4 space-y-1">
            <Link
              to="/account/devices"
              className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Devices <ExternalLink size={14} />
            </Link>
            <Link
              to="/media"
              className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Media Gallery <ImageIcon size={14} />
            </Link>
            <a
              href={`${WEB_BASE_URL}/policies/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Privacy & Security <ExternalLink size={14} />
            </a>
            <a
              href={`${WEB_BASE_URL}/policies/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Terms & Conditions <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                ConectLens Account
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
                Manage your account credentials and basic information.
              </p>

              <div className="space-y-6">
                {/* Wallet Balance */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Coins size={18} className="text-gray-800 dark:text-gray-200" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Credit Balance</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        ≈ ${walletBalance != null ? (walletBalance / 10000).toFixed(2) : '—'} USD
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                      {walletBalance != null
                        ? walletBalance.toLocaleString()
                        : '—'}{' '}
                      <span className="text-sm font-normal text-gray-400">cr</span>
                    </span>
                    <a
                      href="https://app.chainabit.com/billing?utm_source=lenserfight&utm_medium=settings&utm_campaign=topup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary-700 dark:text-primary-400 hover:underline whitespace-nowrap"
                    >
                      Add credits
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Registered Name
                  </label>
                  <input
                    disabled
                    autoComplete="off"
                    value={user?.user_metadata?.display_name || 'N/A'}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    This is the name used for account recovery, access ConectLens products and
                    platforms, stored in identity provider.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    disabled
                    autoComplete="email"
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    User ID
                  </label>
                  <input
                    disabled
                    autoComplete="off"
                    value={user?.id || ''}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-xs"
                  />
                </div>

                {/* Divider before My Feedbacks */}
                <div className="w-full h-px bg-gray-100 dark:bg-gray-800 mt-8 mb-8"></div>

                {/* My Feedbacks Section */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    My Feedbacks
                  </h3>
                  <Table
                    columns={feedbackColumns}
                    data={feedbackData?.data || []}
                    // Since the view might not return 'id', we use created_at + random fallback as key for list stability
                    keyExtractor={(item) => item.id || item.created_at}
                    isLoading={feedbackLoading}
                    pagination={{
                      currentPage: feedbackPage,
                      totalPages: Math.ceil((feedbackData?.total || 0) / FEEDBACK_PAGE_SIZE),
                      onPageChange: setFeedbackPage,
                    }}
                    emptyState={
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 text-gray-400">
                          <MessageSquareDashed size={24} />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          No feedback sent yet.
                        </p>
                      </div>
                    }
                  />
                </div>

                {/* Deactivate Account */}
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Deactivate Account
                  </h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                    Temporarily hide your profile. Your data is preserved and you can reactivate by signing back in.
                  </p>
                  <Button
                    variant="secondary"
                    className="!w-auto px-4 text-sm border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    onClick={async () => {
                      try {
                        await lenserService.deactivateAccount()
                        await logout()
                        navigate('/auth/login')
                      } catch (e) {
                        console.error('Failed to deactivate', e)
                        alert('Failed to deactivate account.')
                      }
                    }}
                  >
                    Deactivate Account
                  </Button>
                </div>

                {/* Danger Area */}
                <DangerZone
                  title="Delete Account"
                  description="Request to permanently delete your account and all associated data. You will have a 30-day grace period to cancel by signing back in. After 30 days, your data will be permanently removed."
                  buttonLabel="Schedule Deletion"
                  onAction={() => setIsDeleteModalOpen(true)}
                />
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Public Profile
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
                This information will be displayed publicly on your Lenser profile.
              </p>

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setShowAvatarModal(true)}
                  >
                    <Avatar
                      src={lenser?.avatar_url}
                      alt={lenser?.display_name}
                      className="!w-24 !h-24 sm:!w-32 sm:!h-32"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white" size={24} />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="text-xs text-primary-700 dark:text-primary-400 font-medium mt-2 text-center w-full hover:underline"
                  >
                    Change Avatar
                  </button>
                </div>

                <div className="flex-1 space-y-6 w-full">
                  <InputField
                    label="Display name"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleProfileChange}
                    required
                    maxLength={50}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none cursor-not-allowed opacity-75"
                        name="handle"
                        value={formData.handle}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <InputField
                  label="Headline"
                  name="headline"
                  value={formData.headline}
                  onChange={handleProfileChange}
                  placeholder="Role, title, or tagline"
                  maxLength={100}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleProfileChange}
                    rows={4}
                    maxLength={300}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none resize-none"
                  />
                  <div className="text-right text-xs text-gray-400 dark:text-gray-500 mt-1">{formData.bio.length}/300</div>
                </div>

                <InputField
                  label="Location"
                  name="location"
                  value={formData.location}
                  onChange={handleProfileChange}
                  placeholder="City, Country"
                  maxLength={100}
                />

                <InputField
                  label="Website"
                  name="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={(e) => { handleProfileChange(e); setWebsiteError(null) }}
                  placeholder="https://yoursite.com"
                  error={websiteError || undefined}
                />

                {/* Social Links */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-bold text-gray-900 dark:text-white">Social Links</label>
                    {getAvailablePlatforms(-1).length > 0 && (
                      <Button type="button" variant="ghost" onClick={handleAddLink} className="flex items-center gap-1.5 w-auto text-xs">
                        <Plus size={14} strokeWidth={3} /> Add Link
                      </Button>
                    )}
                  </div>
                  {loadingLinks ? (
                    <div className="text-center py-6 text-xs text-gray-400 dark:text-gray-500">Loading…</div>
                  ) : (
                    <div className="space-y-4">
                      {socialLinks.map((link, index) => (
                        <div key={index} className="flex flex-col gap-1.5">
                          <div className="flex gap-2 items-start">
                            <div className="w-1/3 min-w-[130px]">
                              <SelectField
                                value={link.platform!}
                                onChange={(val) => handleLinkChange(index, 'platform', val)}
                                options={(() => {
                                  const available = getAvailablePlatforms(index)
                                  const current = SOCIAL_PLATFORMS.find((p) => p.value === link.platform)
                                  if (current && !available.some((p) => p.value === current.value)) return [...available, current]
                                  return available
                                })()}
                                className="w-full"
                              />
                            </div>
                            <div className="flex-1">
                              <input
                                value={link.url}
                                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                placeholder={SOCIAL_URL_VALIDATORS[link.platform!]?.placeholder ?? 'https://'}
                                className={`w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500 ${linkErrors[index] ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(index)}
                              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                          {linkErrors[index] && <p className="text-xs text-red-500 ml-[34%] pl-2">{linkErrors[index]}</p>}
                        </div>
                      ))}
                      {socialLinks.length === 0 && (
                        <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/30 dark:bg-gray-800/30">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Connect your social profiles to build trust.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Profile Visibility
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, visibility: 'public' }))}
                      className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${formData.visibility === 'public'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                      <div className={`p-2 rounded-full ${formData.visibility === 'public'
                          ? 'bg-primary/20 text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                        <Eye size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Public
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Visible to everyone
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, visibility: 'private' }))}
                      className={`flex items-center gap-3 p-4 border rounded-xl transition-all ${formData.visibility === 'private'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                      <div className={`p-2 rounded-full ${formData.visibility === 'private'
                          ? 'bg-primary/20 text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                        <Lock size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Private
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Only visible to approved followers
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
                <Button variant="secondary" className="w-auto px-6">
                  Cancel
                </Button>
                <Button
                  onClick={handleProfileSave}
                  isLoading={isSaving}
                  className="w-auto px-6 bg-primary hover:bg-yellow-400"
                >
                  Save changes
                </Button>
              </div>

              {/* Danger Area Duplicate for Visibility */}
              <DangerZone
                title="Delete Account"
                description="Request to permanently delete your account. You will have a 30-day grace period to cancel by signing back in."
                buttonLabel="Schedule Deletion"
                onAction={() => setIsDeleteModalOpen(true)}
              />
            </div>
          )}

          {/* API KEYS TAB */}
          {activeTab === 'api-keys' && (
            <>
              <div className="flex justify-end mb-4">
                <HelpButton path="/reference/platform-api/tokens" label="API Keys Docs" />
              </div>
              <ApiKeysTab />
            </>
          )}

          {/* GENERAL TAB */}
          {activeTab === 'general' && <GeneralTab />}

          {/* AGENTS TAB */}
          {activeTab === 'agents' && lenser?.type === 'human' && lenser.id && (
            <AgentsTab lenserId={lenser.id} />
          )}

          {/* CONNECTED ACCOUNTS TAB */}
          {activeTab === 'connected-accounts' && <PartnerAccountsTab />}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
                <div className="flex items-center gap-2">
                  <HelpButton path="/explanation/community/notifications" label="About Notifications" />
                  {FEATURES.NOTIFICATIONS && notifications.some((n) => !n.read_at) && (
                    <Button
                      variant="ghost"
                      onClick={markAllRead}
                      className="flex items-center gap-1 w-auto whitespace-nowrap"
                    >
                      <Check size={16} /> Mark all read
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 border-b border-gray-100 dark:border-gray-800 pb-6">
                Manage your alerts and updates.
              </p>

              {!FEATURES.NOTIFICATIONS ? (
                /* Coming Soon — blurred skeleton with overlay */
                <div className="relative rounded-xl overflow-hidden">
                  {/* Skeleton rows (blurred) */}
                  <div className="space-y-3 blur-sm pointer-events-none select-none">
                    {[
                      { w: 'w-48', sub: 'w-64' },
                      { w: 'w-56', sub: 'w-48' },
                      { w: 'w-40', sub: 'w-72' },
                      { w: 'w-52', sub: 'w-56' },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50"
                      >
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className={`h-3 rounded bg-gray-200 dark:bg-gray-700 ${row.w}`} />
                          <div className={`h-2.5 rounded bg-gray-100 dark:bg-gray-800 ${row.sub}`} />
                        </div>
                        <div className="w-10 h-2.5 rounded bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                  {/* Frosted glass overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] rounded-xl">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-semibold shadow-lg">
                      Coming Soon
                    </span>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Notifications are on their way.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setNotifTab('All')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${notifTab === 'All' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setNotifTab('Unread')}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${notifTab === 'Unread' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                    >
                      Unread
                    </button>
                  </div>

                  {notifLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-20 bg-gray-50 dark:bg-gray-800 animate-pulse rounded-lg"
                        ></div>
                      ))}
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                      <p>No notifications found.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredNotifications.map((notification) => (
                        <Card
                          key={notification.id}
                          className={`p-4 flex items-center gap-4 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-gray-100 dark:border-gray-700 ${!notification.read_at ? 'bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-600' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}
                        >
                          {!notification.read_at && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {notification.title}
                            </p>
                            {notification.body && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {notification.body}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                            {timeAgo(notification.created_at)}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Avatar Modal */}
      <AvatarSelectionModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelect={handleAvatarUpdate}
        isLoading={isSaving}
        currentUrl={lenser?.avatar_url}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteRequest}
        title="Schedule Account Deletion"
        message="Are you sure you want to schedule account deletion? Your account will be hidden immediately and permanently deleted after 30 days. You can cancel by signing back in during the grace period."
        confirmLabel="Schedule Deletion"
        isLoading={isDeleting}
      />
    </div>
  )
}
