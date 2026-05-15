import React, { useState } from 'react'
import { Key, Plus, Trash2, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Button, Badge, Skeleton } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { ConfirmModal } from '@lenserfight/ui/modals'
import { ByokProvider, BYOK_PROVIDER_LABELS, UserApiKey } from '@lenserfight/types'
import { useApiKeys } from '../hooks/useApiKeys'

const PROVIDER_OPTIONS = (Object.keys(BYOK_PROVIDER_LABELS) as ByokProvider[]).map((key) => ({
  value: key,
  label: BYOK_PROVIDER_LABELS[key],
}))

const maskKey = (suffix: string) => `${'•'.repeat(8)}${suffix}`

export const ApiKeysTab: React.FC = () => {
  const { keys, isLoading, selectedKeyId, storeKey, isStoring, storeError, revokeKey, isRevoking, selectKey, isSelecting } = useApiKeys()

  // Form state
  const [provider, setProvider] = useState<ByokProvider | ''>('')
  const [label, setLabel] = useState('')
  const [rawKey, setRawKey] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Revoke state
  const [revokeTarget, setRevokeTarget] = useState<UserApiKey | null>(null)

  const handleStore = () => {
    if (!provider || provider === 'ollama' || !rawKey.trim()) return
    storeKey(
      { provider, label: label.trim() || undefined, rawKey: rawKey.trim() },
      {
        onSuccess: () => {
          setRawKey('')
          setLabel('')
          setProvider('')
          setShowForm(false)
        },
      }
    )
  }

  const handleRevoke = () => {
    if (!revokeTarget) return
    revokeKey(revokeTarget.id, {
      onSuccess: () => setRevokeTarget(null),
    })
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">API Keys</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        Bring your own API keys for AI providers. Keys are encrypted at rest and never displayed in full.
      </p>

      {/* Add Key Section */}
      {!showForm ? (
        <Button
          onClick={() => setShowForm(true)}
          variant="secondary"
          className="!w-auto flex items-center gap-2 mb-8"
        >
          <Plus size={16} />
          Add API Key
        </Button>
      ) : (
        <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 mb-8 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Add New Key</h3>

          <SelectField
            value={provider}
            onChange={(val) => setProvider(val as ByokProvider)}
            placeholder="Select a provider"
            options={PROVIDER_OPTIONS}
          />

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Label <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Production, Testing"
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
          </div>

          {storeError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {(storeError as Error).message || 'Failed to store key.'}
            </p>
          )}

          <div className="flex items-center gap-3 justify-end pt-1">
            <Button
              variant="ghost"
              className="!w-auto"
              onClick={() => {
                setShowForm(false)
                setRawKey('')
                setLabel('')
                setProvider('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStore}
              isLoading={isStoring}
              disabled={!provider || rawKey.trim().length < 8}
              className="!w-auto px-6"
            >
              Add Key
            </Button>
          </div>
        </div>
      )}

      {/* Key List */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">Your Keys</h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 text-gray-400">
              <Key size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No API keys added yet.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Add a key to use your own AI provider accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => {
              const isSelected = selectedKeyId === key.id
              return (
                <div
                  key={key.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-white dark:bg-gray-800 transition-colors ${
                    isSelected
                      ? 'border-primary-500 dark:border-primary-400'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-md ${isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <ShieldCheck size={16} className={isSelected ? 'text-primary-500' : 'text-gray-500 dark:text-gray-400'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {key.providerDisplayName}
                        </Badge>
                        {key.label && (
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {key.label}
                          </span>
                        )}
                        {isSelected && (
                          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                            <CheckCircle2 size={12} />
                            In use
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          {maskKey(key.keySuffix)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isSelected && (
                      <Button
                        variant="ghost"
                        className="!w-auto !px-3 !py-1.5 text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                        onClick={() => selectKey(key.id)}
                        isLoading={isSelecting}
                        disabled={isSelecting}
                      >
                        Use this key
                      </Button>
                    )}
                    {isSelected && (
                      <Button
                        variant="ghost"
                        className="!w-auto !px-3 !py-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => selectKey(null)}
                        disabled={isSelecting}
                      >
                        Unset
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="!w-auto !p-2 text-gray-400 hover:text-red-500"
                      onClick={() => setRevokeTarget(key)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Revoke Confirmation */}
      <ConfirmModal
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke API Key"
        message={`Are you sure you want to revoke the ${revokeTarget?.providerDisplayName ?? ''} key${revokeTarget?.label ? ` "${revokeTarget.label}"` : ''}? This key will no longer be usable for AI executions.`}
        confirmLabel="Revoke"
        isLoading={isRevoking}
      />
    </div>
  )
}
