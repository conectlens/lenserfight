import { apiKeysService } from '@lenserfight/data/repositories'
import type { UserApiKey, CloudByokProvider } from '@lenserfight/types'
import { Button, Card, Badge } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Dialog } from '@lenserfight/ui/overlays'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, ShieldX, Plus } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { SectionPage } from './SectionPage'

// Only providers the vault can store — mirrors apiKeysService.ALLOWED_PROVIDERS
const CLOUD_PROVIDERS: CloudByokProvider[] = ['openai', 'anthropic', 'google', 'mistral']

const API_KEYS_QUERY_KEY = ['apiKeys', 'mine'] as const

function HealthBadge({ isActive }: { isActive: boolean }) {
  if (!isActive) {
    return (
      <Badge color="red" size="sm" className="gap-1.5">
        <ShieldX className="w-3 h-3" />
        Revoked
      </Badge>
    )
  }
  return (
    <Badge color="green" size="sm" className="gap-1.5">
      <ShieldCheck className="w-3 h-3" />
      Active
    </Badge>
  )
}

interface RegisterFormState {
  provider: CloudByokProvider
  key: string
  label: string
}

const EMPTY_FORM: RegisterFormState = { provider: 'openai', key: '', label: '' }

export const ByokSection: React.FC = () => {
  const { viewMode } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner'
  const queryClient = useQueryClient()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [form, setForm] = React.useState<RegisterFormState>(EMPTY_FORM)
  const [formError, setFormError] = React.useState<string | null>(null)

  // Single data source: same fn_get_my_api_keys RPC used by /settings/api-keys.
  // The RPC resolves against the human profile (not the active lenser selection)
  // so it returns the correct keys even when viewed from the agent workspace.
  const keysQuery = useQuery<UserApiKey[]>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: () => apiKeysService.getMyKeys(),
    enabled: isOwner,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  const revokeMutation = useMutation({
    mutationFn: (keyId: string) => apiKeysService.revokeKey(keyId),
    onSuccess: (_, keyId) => {
      queryClient.setQueryData<UserApiKey[]>(
        API_KEYS_QUERY_KEY,
        (prev = []) => prev.map((k) => k.id === keyId ? { ...k, isActive: false, revokedAt: new Date().toISOString() } : k),
      )
    },
  })

  const storeMutation = useMutation({
    mutationFn: ({ provider, key, label }: RegisterFormState) =>
      apiKeysService.storeKey({ provider, rawKey: key, label: label || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY })
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setFormError(null)
    },
    onError: (err: Error) => {
      setFormError(err.message ?? 'Failed to store key.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!form.key.trim() || form.key.trim().length < 8) {
      setFormError('API key must be at least 8 characters.')
      return
    }
    storeMutation.mutate(form)
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
      docsPath="/how-to/agents/workspace/byok"
      docsTip="Bring Your Own Key. Keys are encrypted at rest via Vault, never echoed in full. The same keys are accessible from Settings → API Keys."
      title="API Keys (BYOK)"
      description="Manage your Bring-Your-Own-Key API credentials. Keys are encrypted at rest and never shown in full."
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
        <div className="flex flex-col gap-3">
          {keys.map((key) => (
            <Card
              key={key.id}
              className="flex items-center justify-between gap-4 !p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-4 h-4 text-greyscale-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-100">
                    {key.providerDisplayName}
                  </p>
                  {key.label && (
                    <p className="text-xs text-greyscale-500 dark:text-greyscale-400 truncate">
                      {key.label}
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs text-greyscale-500 dark:text-greyscale-400">
                  ···· {key.keySuffix}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HealthBadge isActive={key.isActive} />
                {key.isActive && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => revokeMutation.mutate(key.id)}
                    disabled={revokeMutation.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Register API Key"
        description="The key is stored server-side via Vault and never returned in full."
        icon={<KeyRound className="w-5 h-5" />}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <SelectField
              label="Provider"
              value={form.provider}
              onChange={(value) => setForm((f) => ({ ...f, provider: value as CloudByokProvider }))}
              options={CLOUD_PROVIDERS.map((p) => ({ value: p, label: p }))}
            />
          </div>

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
              disabled={storeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={storeMutation.isPending}
            >
              {storeMutation.isPending ? 'Saving…' : 'Save Key'}
            </Button>
          </div>
        </form>
      </Dialog>
    </SectionPage>
  )
}
