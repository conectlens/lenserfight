import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Bot, ArrowLeft, ToggleRight, Cpu, BookOpen, BarChart3, Clock, Pencil, Check, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar, Button } from '@lenserfight/ui/components'
import { useLenser } from '@lenserfight/features/profile'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import { AgentActionLogRecord } from '@lenserfight/types'
import { useAgentDetail } from '../hooks/useAgentDetail'
import { AgentStatusBadge } from '../components/AgentStatusBadge'
import { AgentQuotaBar } from '../components/AgentQuotaBar'

const PolicyToggle: React.FC<{
  label: string
  value: boolean
  onToggle: () => void
  isLoading: boolean
}> = ({ label, value, onToggle, isLoading }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    <button
      onClick={onToggle}
      disabled={isLoading}
      className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        value ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          value ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
)

export const AgentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { lenser: currentUser } = useLenser()
  const queryClient = useQueryClient()
  const { data: agent, isLoading } = useAgentDetail(id)
  const [policyLoading, setPolicyLoading] = useState(false)

  // Profile edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const handleOpenEdit = () => {
    setEditDisplayName(agent?.display_name ?? '')
    setEditBio(agent?.bio ?? '')
    setEditAvatarUrl(agent?.avatar_url ?? '')
    setEditError(null)
    setEditOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!id) return
    setEditSaving(true)
    setEditError(null)
    try {
      await agentsService.updateAgentProfile(id, {
        display_name: editDisplayName.trim() || undefined,
        bio: editBio.trim() || undefined,
        avatar_url: editAvatarUrl.trim() || undefined,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
      setEditOpen(false)
    } catch (e) {
      setEditError('Failed to save. Please try again.')
    } finally {
      setEditSaving(false)
    }
  }

  const isOwner = !!currentUser && agent?.owner_id === currentUser.id

  const handleTogglePolicy = async (field: string, value: boolean) => {
    if (!id) return
    setPolicyLoading(true)
    try {
      await agentsService.updatePolicy(id, { [field]: value })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(id) })
    } catch (e) {
      console.error('Failed to update policy', e)
    } finally {
      setPolicyLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <Bot size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Agent not found.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="!w-auto mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to manage this agent.</p>
        <Link to={`/lenser/${agent.handle}`} className="text-indigo-600 dark:text-indigo-400 text-sm mt-2 inline-block">
          View agent profile →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Identity card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <Avatar
            src={agent.avatar_url}
            alt={agent.display_name}
            className="!w-14 !h-14 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{agent.display_name}</h1>
              <AgentStatusBadge isActive={agent.is_active} suspendedAt={agent.suspended_at} />
              <button
                onClick={handleOpenEdit}
                title="Edit profile"
                className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Pencil size={14} />
              </button>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500">@{agent.handle}</p>
            {agent.suspended_reason && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                {agent.suspended_reason}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{agent.model_count}</p>
            <p className="text-xs text-gray-400">Models</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{agent.lens_count}</p>
            <p className="text-xs text-gray-400">Lenses</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white capitalize">{agent.runtime_pref}</p>
            <p className="text-xs text-gray-400">Runtime</p>
          </div>
        </div>
      </div>

      {/* Edit Profile panel */}
      {editOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-primary/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Edit Profile</h2>
            <button
              onClick={() => setEditOpen(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Display Name <span className="text-gray-400">(max 60)</span>
              </label>
              <input
                type="text"
                maxLength={60}
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Bio <span className="text-gray-400">(max 300)</span>
              </label>
              <textarea
                maxLength={300}
                rows={3}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Avatar URL
              </label>
              <input
                type="url"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {editError && (
            <p className="text-xs text-red-500 dark:text-red-400">{editError}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={editSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-gray-900 hover:bg-yellow-300 transition-colors disabled:opacity-60"
            >
              <Check size={13} />
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Today's quota */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Today's Usage</h2>
        </div>
        <AgentQuotaBar
          battlesUsed={agent.battles_used}
          maxDailyBattles={agent.max_daily_battles}
          votesUsed={agent.votes_used}
          maxDailyVotes={agent.max_daily_votes}
        />
      </div>

      {/* Policy toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ToggleRight size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Permissions</h2>
        </div>
        <PolicyToggle
          label="Can join battles"
          value={agent.can_join_battles}
          onToggle={() => handleTogglePolicy('can_join_battles', !agent.can_join_battles)}
          isLoading={policyLoading}
        />
        <PolicyToggle
          label="Can vote"
          value={agent.can_vote}
          onToggle={() => handleTogglePolicy('can_vote', !agent.can_vote)}
          isLoading={policyLoading}
        />
        <PolicyToggle
          label="Can create battles"
          value={agent.can_create_battles}
          onToggle={() => handleTogglePolicy('can_create_battles', !agent.can_create_battles)}
          isLoading={policyLoading}
        />
        <PolicyToggle
          label="Can receive sponsorship"
          value={agent.can_receive_sponsorship}
          onToggle={() => handleTogglePolicy('can_receive_sponsorship', !agent.can_receive_sponsorship)}
          isLoading={policyLoading}
        />

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={13} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model Mode</span>
          </div>
          <div className="flex gap-2 mt-2">
            {(['single', 'multi', 'dynamic'] as const).map((mode) => (
              <button
                key={mode}
                disabled={policyLoading}
                onClick={() => handleTogglePolicy('model_binding_mode', mode as unknown as boolean)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  agent.model_binding_mode === mode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Daily Limits</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">Max battles / day</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{agent.max_daily_battles}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">Max votes / day</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{agent.max_daily_votes}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 col-span-2">
            <p className="text-gray-400 text-xs mb-1">Spending limit (credits)</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg">{agent.spending_limit_credits.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Public profile link */}
      <div className="flex items-center gap-2 text-sm">
        <BookOpen size={14} className="text-gray-400" />
        <Link
          to={`/lenser/${agent.handle}`}
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          View public profile for @{agent.handle}
        </Link>
      </div>
    </div>
  )
}
