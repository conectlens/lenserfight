import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ByokKeyHint } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { Dialog } from '@lenserfight/ui/overlays'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, ShieldX, Clock, Plus } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { SectionPage } from './SectionPage'

const KNOWN_PROVIDERS = ['openai', 'anthropic', 'gemini', 'mistral', 'cohere', 'groq', 'together']

function HealthBadge({ isValid, expiresAt }: { isValid: boolean; expiresAt?: string | null }) {
  if (!isValid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <ShieldX className="w-3 h-3" />
        Expired / Revoked
      </span>
    )
  }
  if (expiresAt) {
    const daysLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
    if (daysLeft < 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="w-3 h-3" />
          Expires in {daysLeft}d
        </span>
      )
    }
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ShieldCheck className="w-3 h-3" />
      Active
    </span>
  )
}

interface RegisterFormState {
  provider: string
  customProvider: string
  key: string
  label: string
}

const EMPTY_FORM: RegisterFormState = { provider: 'openai', customProvider: '', key: '', label: '' }

export const ByokSection: React.FC = () => {
  const { viewMode, bootstrap } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner'
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<RegisterFormState>(EMPTY_FORM)
  const [formError, setFormError] = React.useState<string | null>(null)

  const keysQuery = useQuery<ByokKeyHint[]>({
    queryKey: ['byok', 'keys', aiLenserId],
    queryFn: () => agentWorkspaceService.listByokKeyHints(aiLenserId),
    enabled: isOwner && !!aiLenserId,
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: ({ provider }: { provider: string }) =>
      agentWorkspaceService.revokeByokKey(aiLenserId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['byok', 'keys', aiLenserId] })
    },
  })

  const registerMutation = useMutation({
    mutationFn: ({
      provider,
      key,
      label,
    }: {
      provider: string
      key: string
      label: string
    }) => {
      const hint = key.length >= 4 ? key.slice(-4) : key
      return agentWorkspaceService.registerByokKey(aiLenserId, provider, key, hint, label || undefined)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['byok', 'keys', aiLenserId] })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setFormError(null)
    },
    onError: (err: Error) => {
      setFormError(err.message ?? 'Failed to register key.')
    },
  })

  const resolvedProvider =
    form.provider === '__custom__' ? form.customProvider.trim() : form.provider

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!resolvedProvider) {
      setFormError('Provider is required.')
      return
    }
    if (!form.key.trim()) {
      setFormError('API key is required.')
      return
    }
    registerMutation.mutate({ provider: resolvedProvider, key: form.key.trim(), label: form.label.trim() })
  }

  function handleOpenDialog() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const keys = keysQuery.data ?? []

  return (
    <SectionPage
      eyebrow="Security"
      title="API Keys (BYOK)"
      description="Manage your Bring-Your-Own-Key API credentials. Keys are stored encrypted and never shown in full."
      toolbar={
        isOwner ? (
          <Button variant="secondary" size="sm" onClick={handleOpenDialog}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Key
          </Button>
        ) : undefined
      }
    >
      {!isOwner ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          Only the agent owner can manage API keys.
        </p>
      ) : keysQuery.isLoading ? (
        <p className="text-sm text-greyscale-400 animate-pulse">Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          No BYOK keys registered yet. Click <strong>Add Key</strong> above to add one.
        </p>
      ) : (
        <div className="divide-y divide-greyscale-200 dark:divide-greyscale-800 rounded-xl border border-greyscale-200 dark:border-greyscale-800 overflow-hidden">
          {keys.map((key) => (
            <div
              key={key.provider}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-greyscale-950"
            >
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-4 h-4 text-greyscale-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-100 capitalize">
                    {key.provider}
                  </p>
                  {key.label && (
                    <p className="text-xs text-greyscale-500 dark:text-greyscale-400 truncate">
                      {key.label}
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs text-greyscale-500 dark:text-greyscale-400">
                  ···· {key.key_hint ?? '????'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HealthBadge isValid={key.is_valid} />
                {key.is_valid && (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate({ provider: key.provider })}
                    disabled={revokeMutation.isPending}
                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Register API Key"
        description="The key is stored server-side and never returned in full."
        icon={<KeyRound className="w-5 h-5" />}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
              Provider
            </label>
            <select
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-greyscale-200 dark:border-greyscale-700 bg-white dark:bg-greyscale-900 text-sm text-greyscale-900 dark:text-greyscale-100 focus:outline-none focus:ring-2 focus:ring-primary-yellow-400/50"
            >
              {KNOWN_PROVIDERS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
              <option value="__custom__">Other…</option>
            </select>
          </div>

          {form.provider === '__custom__' && (
            <div>
              <label className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
                Provider name
              </label>
              <input
                type="text"
                value={form.customProvider}
                onChange={(e) => setForm((f) => ({ ...f, customProvider: e.target.value }))}
                placeholder="e.g. ollama, custom-llm"
                className="w-full px-3 py-2 rounded-lg border border-greyscale-200 dark:border-greyscale-700 bg-white dark:bg-greyscale-900 text-sm text-greyscale-900 dark:text-greyscale-100 focus:outline-none focus:ring-2 focus:ring-primary-yellow-400/50"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="sk-…"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-lg border border-greyscale-200 dark:border-greyscale-700 bg-white dark:bg-greyscale-900 text-sm text-greyscale-900 dark:text-greyscale-100 focus:outline-none focus:ring-2 focus:ring-primary-yellow-400/50 font-mono"
            />
            <p className="mt-1 text-xs text-greyscale-400">
              The last 4 characters are saved as a hint. The full key is never returned.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-greyscale-700 dark:text-greyscale-300 mb-1">
              Label <span className="text-greyscale-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Production key"
              className="w-full px-3 py-2 rounded-lg border border-greyscale-200 dark:border-greyscale-700 bg-white dark:bg-greyscale-900 text-sm text-greyscale-900 dark:text-greyscale-100 focus:outline-none focus:ring-2 focus:ring-primary-yellow-400/50"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={registerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Saving…' : 'Save Key'}
            </Button>
          </div>
        </form>
      </Dialog>
    </SectionPage>
  )
}
