import React, { useEffect, useState } from 'react'
import { KeyRound, HardDrive, Globe, Plus, X, Eye, EyeOff, Pencil, Loader2 } from 'lucide-react'
import { SearchSelectField, SelectField } from '@lenserfight/ui/forms'
import { Dialog } from '@lenserfight/ui/overlays'
import { FundingSource, UserApiKey, WalletBalance, BYOK_PROVIDER_LABELS, AIProvider, AIProviderModel } from '@lenserfight/types'
import { SURFACE, CHAINABIT_APP_URL } from '@lenserfight/utils/env'
import { Link } from 'react-router-dom'
import type { LocalKeyMeta, ChainabitConnectionState, ChainabitAiModel } from '@lenserfight/types'
import { LabProviderSelector } from './LabProviderSelector'
import { useOllamaModels } from '../hooks/useOllamaModels'

interface FundingSourceToggleProps {
  fundingSource: FundingSource
  onFundingSourceChange: (source: FundingSource) => void
  // Cloud BYOK
  selectedKeyRefId: string | null
  onKeyRefIdChange: (keyId: string) => void
  availableKeys: UserApiKey[]
  // Local BYOK
  selectedLocalKeyId: string | null
  onLocalKeyIdChange: (keyId: string) => void
  availableLocalKeys: LocalKeyMeta[]
  onAddLocalKey: (provider: string, label: string, rawKey: string) => Promise<void>
  onRemoveLocalKey?: (id: string) => Promise<void>
  onUpdateLocalKey?: (id: string, rawKey: string, label: string) => Promise<void>
  // Common
  walletBalance: WalletBalance | undefined
  canUseBYOK: boolean
  // Chainabit connection state
  chainabitState?: ChainabitConnectionState
  chainabitModels?: ChainabitAiModel[] | null
  onChainabitConnect?: () => void
  // Optional: Provider/Model selection section (shown when onModelChange is provided)
  providers?: AIProvider[]
  isLoadingProviders?: boolean
  providerModels?: AIProviderModel[]
  isLoadingModels?: boolean
  selectedProviderKey?: string
  onProviderChange?: (key: string) => void
  selectedModelKey?: string
  onModelChange?: (key: string) => void
  onProviderDropdownOpen?: () => void
}

function ChainabitLogo({ size = 16 }: { size?: number }) {
  return (
    <img
      src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png"
      width={size}
      height={size}
      alt="Chainabit"
      style={{ objectFit: 'contain' }}
    />
  )
}

const PROVIDER_OPTIONS = Object.entries(BYOK_PROVIDER_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function AddLocalKeyForm({
  onAdd,
  onCancel,
}: {
  onAdd: (provider: string, label: string, rawKey: string) => Promise<void>
  onCancel: () => void
}) {
  const [provider, setProvider] = useState('')
  const [label, setLabel] = useState('')
  const [rawKey, setRawKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOllama = provider === 'ollama'

  const handleSave = async () => {
    if (!provider) return
    if (!rawKey && !isOllama) {
      setError('Please enter an API key.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onAdd(provider, label || provider, rawKey)
      onCancel()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('secure context')
          ? 'Encryption unavailable — local keys require HTTPS or localhost.'
          : 'Failed to save key. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Add local key</p>

      <SelectField
        value={provider}
        onChange={setProvider}
        placeholder="Select provider…"
        options={PROVIDER_OPTIONS}
      />

      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (optional)"
        className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          autoComplete="off"
          value={rawKey}
          onChange={(e) => setRawKey(e.target.value)}
          placeholder={isOllama ? 'API key (optional, for cloud models)…' : 'API key…'}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={() => setShowKey((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {isOllama && (
        <p className="text-[10px] text-gray-400">
          Ollama runs locally — no key needed for local models. For cloud models (e.g. <code>:cloud</code>), enter your Ollama API key from{' '}
          <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="underline">ollama.com</a>.
        </p>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !provider}
          className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Saving…' : 'Save locally'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      <p className="text-[10px] text-gray-400">
        Encrypted in your browser. Never sent to our servers.
      </p>
    </div>
  )
}

function EditLocalKeyModal({
  keyMeta,
  onSave,
  onClose,
}: {
  keyMeta: LocalKeyMeta
  onSave: (id: string, rawKey: string, label: string) => Promise<void>
  onClose: () => void
}) {
  const [label, setLabel] = useState(keyMeta.label !== keyMeta.provider ? keyMeta.label : '')
  const [rawKey, setRawKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerLabel = BYOK_PROVIDER_LABELS[keyMeta.provider as keyof typeof BYOK_PROVIDER_LABELS] ?? keyMeta.provider
  const isOllama = keyMeta.provider === 'ollama'

  const handleSave = async () => {
    if (!rawKey && !isOllama) {
      setError('Please enter a new API key.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(keyMeta.id, rawKey, label || keyMeta.provider)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(
        msg.includes('secure context')
          ? 'Encryption unavailable — local keys require HTTPS or localhost.'
          : 'Failed to update key. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Update ${providerLabel} key`}
      description={keyMeta.label && keyMeta.label !== keyMeta.provider ? keyMeta.label : undefined}
      maxWidth="max-w-sm"
    >
      <div className="flex flex-col gap-3 p-1">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            New API key{isOllama ? ' (optional)' : ''}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value)}
              placeholder={isOllama ? 'Leave blank to keep existing…' : 'Paste new key…'}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-[10px] text-gray-400">Encrypted in your browser. Never sent to our servers.</p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? 'Saving…' : 'Update key'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export const FundingSourceToggle: React.FC<FundingSourceToggleProps> = ({
  fundingSource,
  onFundingSourceChange,
  selectedKeyRefId,
  onKeyRefIdChange,
  availableKeys,
  selectedLocalKeyId,
  onLocalKeyIdChange,
  availableLocalKeys,
  onAddLocalKey,
  onRemoveLocalKey: _onRemoveLocalKey,
  onUpdateLocalKey,
  walletBalance,
  canUseBYOK,
  chainabitState,
  chainabitModels,
  onChainabitConnect,
  // Model/Provider selection props
  providers,
  isLoadingProviders,
  providerModels,
  isLoadingModels,
  selectedProviderKey,
  onProviderChange,
  selectedModelKey,
  onModelChange,
  onProviderDropdownOpen,
}) => {
  const isCloud = fundingSource === 'platform_credit'
  const isByokCloud = fundingSource === 'user_byok_cloud'
  const isByokLocal = fundingSource === 'user_byok_local'
  const isByok = isByokCloud || isByokLocal
  const [showAddLocalKey, setShowAddLocalKey] = useState(false)
  const [editingKey, setEditingKey] = useState<LocalKeyMeta | null>(null)
  const isCloudEdition = SURFACE.edition === 'cloud'
  const localKeyEnabled = !isCloudEdition
  const selectableByokCount = isCloudEdition ? availableKeys.length : availableLocalKeys.length
  const canSelectByok = canUseBYOK && (isCloudEdition ? true : localKeyEnabled)

  const chainabitConnected = chainabitState === 'connected' || chainabitState === 'no_credits'
  const chainabitActive = chainabitState === 'connected'
  const chainabitNeedsAction = chainabitState === 'no_account' || chainabitState === 'invalid_connection'
  const chainabitIsDisabled =
    chainabitState === 'loading' ||
    chainabitState === 'no_credits' ||
    chainabitState === 'provider_error'
  const topUpUrl = `${CHAINABIT_APP_URL}/billing?utm_source=lenserfight&utm_medium=toggle&utm_campaign=topup`

  const handleChainabitClick = () => {
    if (chainabitIsDisabled) return
    if (chainabitNeedsAction) {
      onChainabitConnect?.()
      return
    }
    onFundingSourceChange('platform_credit')
  }

  useEffect(() => {
    if (!isCloudEdition && (fundingSource === 'platform_credit' || fundingSource === 'user_byok_cloud')) {
      setShowAddLocalKey(false)
      onFundingSourceChange('user_byok_local')
    }
  }, [isCloudEdition, fundingSource, onFundingSourceChange])

  // When Chainabit is definitively unavailable and the user is on platform_credit,
  // fall back to cloud BYOK keys (cloud edition) or local keys (self-hosted).
  useEffect(() => {
    const chainabitDefinitelyUnavailable =
      chainabitState === 'no_credits' ||
      chainabitState === 'no_account' ||
      chainabitState === 'invalid_connection' ||
      chainabitState === 'provider_error'
    if (isCloudEdition && fundingSource === 'platform_credit' && chainabitDefinitelyUnavailable) {
      onFundingSourceChange('user_byok_cloud')
    }
  }, [chainabitState, fundingSource, isCloudEdition, onFundingSourceChange])

  // Derive effective provider key based on funding mode
  const effectiveProviderKey = isByokCloud
    ? (availableKeys.find((k) => k.id === selectedKeyRefId)?.providerKey ?? '')
    : isByokLocal
      ? (availableLocalKeys.find((k) => k.id === selectedLocalKeyId)?.provider ?? '')
      : selectedProviderKey ?? ''

  const isOllamaLocal = isByokLocal && effectiveProviderKey === 'ollama'

  // Always call useOllamaModels (gated internally when not enabled)
  const {
    isRunning: ollamaIsRunning,
    isLoading: isLoadingOllama,
    models: ollamaModels,
    error: ollamaError,
    refetch: refetchOllama,
  } = useOllamaModels(isOllamaLocal)

  const handleMyKeyClick = () => {
    if (!canSelectByok) return
    if (isCloudEdition) {
      onFundingSourceChange('user_byok_cloud')
      return
    }
    onFundingSourceChange('user_byok_local')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Funding
      </label>

      {/* Row 1: Cloud | My Key */}
      <div className={`grid gap-2 ${isCloudEdition ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {isCloudEdition && (
          <button
            type="button"
            onClick={handleChainabitClick}
            disabled={chainabitIsDisabled}
            className={`flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${isCloud && chainabitActive
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-400'
                : chainabitIsDisabled
                  ? 'border-gray-200 dark:border-gray-600 opacity-60 cursor-not-allowed'
                  : chainabitNeedsAction
                    ? 'border-gray-200 dark:border-gray-600 opacity-60 hover:border-orange-300 hover:opacity-100'
                    : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
              }`}
          >
            <ChainabitLogo size={16} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Chainabit</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums flex items-center gap-1">
                {chainabitState === 'loading' ? (
                  <><Loader2 size={10} className="animate-spin" />Checking…</>
                ) : chainabitState === 'provider_error' ? (
                  'Unavailable'
                ) : chainabitActive && walletBalance != null ? (
                  `${walletBalance.balance.toLocaleString()} cr`
                ) : chainabitState === 'no_credits' ? (
                  'No credits'
                ) : chainabitNeedsAction ? (
                  'Connect'
                ) : (
                  '—'
                )}
              </p>
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={handleMyKeyClick}
          disabled={!canSelectByok}
          className={`flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${isByok
            ? 'border-primary bg-primary/5 ring-1 ring-primary'
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            } ${!canSelectByok ? 'opacity-60 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-600' : ''}`}
        >
          <KeyRound size={16} className={isByok ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {isCloudEdition ? 'My Keys' : 'Local Keys'}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {selectableByokCount > 0
                ? `${selectableByokCount} key${selectableByokCount > 1 ? 's' : ''}`
                : isCloudEdition ? 'Add in Settings' : 'Add a key'}
            </p>
          </div>
        </button>
      </div>

      {/* Row 2: LF Cloud Keys | Local Keys sub-mode (visible when isByok) */}
      {isCloudEdition && (isByokCloud || (isByokLocal && localKeyEnabled)) && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFundingSourceChange('user_byok_cloud')}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${isByokCloud
              ? 'border-primary bg-primary/5 ring-1 ring-primary font-semibold text-gray-900 dark:text-gray-100'
              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
              }`}
          >
            <Globe size={12} />
            LF Cloud Keys
            {availableKeys.length > 0 && (
              <span className="ml-auto text-[10px] text-gray-400">{availableKeys.length}</span>
            )}
          </button>

          {localKeyEnabled && (
            <button
              type="button"
              onClick={() => onFundingSourceChange('user_byok_local')}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${isByokLocal
                ? 'border-primary bg-primary/5 ring-1 ring-primary font-semibold text-gray-900 dark:text-gray-100'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
            >
              <HardDrive size={12} />
              Local Keys
              {availableLocalKeys.length > 0 && (
                <span className="ml-auto text-[10px] text-gray-400">{availableLocalKeys.length}</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Row 3: Key selector */}
      {isCloudEdition && isByokCloud && availableKeys.length > 0 && (
        <SearchSelectField
          value={selectedKeyRefId ?? ''}
          onChange={onKeyRefIdChange}
          placeholder="Select an API key"
          options={availableKeys.map((k) => ({
            value: k.id,
            label: `${k.providerDisplayName}${k.label ? ` — ${k.label}` : ''} (••••${k.keySuffix})`,
          }))}
        />
      )}

      {localKeyEnabled && isByokLocal && availableLocalKeys.length > 0 && !showAddLocalKey && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0">
              <SearchSelectField
                value={selectedLocalKeyId ?? ''}
                onChange={onLocalKeyIdChange}
                placeholder="Select a local key"
                options={availableLocalKeys.map((k) => ({
                  value: k.id,
                  label: `${BYOK_PROVIDER_LABELS[k.provider as keyof typeof BYOK_PROVIDER_LABELS] ?? k.provider}${k.label && k.label !== k.provider ? ` — ${k.label}` : ''}`,
                }))}
              />
            </div>
            {onUpdateLocalKey && selectedLocalKeyId && (
              <button
                type="button"
                onClick={() => {
                  const key = availableLocalKeys.find((k) => k.id === selectedLocalKeyId)
                  if (key) setEditingKey(key)
                }}
                className="shrink-0 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 transition-colors"
                title="Update this key"
              >
                <Pencil size={13} />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Encrypted in your browser. Never sent to our servers.
          </p>
        </div>
      )}

      {editingKey && onUpdateLocalKey && (
        <EditLocalKeyModal
          keyMeta={editingKey}
          onSave={onUpdateLocalKey}
          onClose={() => setEditingKey(null)}
        />
      )}

      {/* Row 4: Inline add local key form */}
      {localKeyEnabled && isByokLocal && !showAddLocalKey && (
        <button
          type="button"
          onClick={() => setShowAddLocalKey(true)}
          className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
        >
          <Plus size={12} />
          {availableLocalKeys.length === 0 ? 'Add a local key' : 'Add another key'}
        </button>
      )}

      {localKeyEnabled && isByokLocal && showAddLocalKey && (
        <AddLocalKeyForm
          onAdd={onAddLocalKey}
          onCancel={() => setShowAddLocalKey(false)}
        />
      )}

      {/* Cloud BYOK — no keys hint */}
      {isCloudEdition && isByokCloud && availableKeys.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No cloud API keys.{' '}
          <Link to="/settings/api-keys" className="text-primary-600 dark:text-primary-400 hover:underline">
            Add one in Settings
          </Link>
        </p>
      )}

      {/* Low balance hint */}
      {isCloudEdition && isCloud && chainabitState === 'no_credits' && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No credits remaining.{' '}
          <a
            href={topUpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Add credits on Chainabit
          </a>
        </p>
      )}

      {/* Provider / Model selector — rendered when onModelChange is provided */}
      {onModelChange && (
        <LabProviderSelector
          fundingSource={fundingSource}
          effectiveProviderKey={effectiveProviderKey}
          providers={providers ?? []}
          isLoadingProviders={isLoadingProviders ?? false}
          providerModels={providerModels ?? []}
          isLoadingModels={isLoadingModels ?? false}
          selectedProviderKey={selectedProviderKey ?? ''}
          selectedModelKey={selectedModelKey ?? ''}
          onProviderChange={onProviderChange ?? (() => { })}
          onModelChange={onModelChange}
          onProviderDropdownOpen={onProviderDropdownOpen}
          isOllamaLocal={isOllamaLocal}
          ollamaIsRunning={ollamaIsRunning}
          isLoadingOllama={isLoadingOllama}
          ollamaModels={ollamaModels}
          ollamaError={ollamaError}
          refetchOllama={refetchOllama}
          chainabitModels={chainabitModels}
          chainabitConnected={chainabitConnected}
          chainabitLoading={chainabitState === 'loading'}
        />
      )}
    </div>
  )
}
