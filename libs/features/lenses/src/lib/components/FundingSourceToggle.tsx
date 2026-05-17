import { LocalKeysGatewayClient } from '@lenserfight/data/local-keys-browser'
import { FundingSource, UserApiKey, WalletBalance, BYOK_PROVIDER_LABELS, AIProvider, AIProviderModel } from '@lenserfight/types'
import { SearchSelectField, SelectField } from '@lenserfight/ui/forms'
import { HelpButton } from '@lenserfight/ui/components'
import { Dialog } from '@lenserfight/ui/overlays'
import { CHAINABIT_APP_URL, DOCS_BASE_URL } from '@lenserfight/utils/env'
import { HardDrive, Globe, Plus, X, Eye, EyeOff, Pencil, Loader2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { useFundingCapabilities } from '../hooks/useFundingCapabilities'
import { useOllamaModels } from '../hooks/useOllamaModels'

import { LabProviderSelector } from './LabProviderSelector'

import type { LocalKeyMeta, ChainabitConnectionState, ChainabitAiModel } from '@lenserfight/types'

type LocalKeyAvailability =
  | 'available'
  | 'gateway_unreachable'
  | 'gateway_not_paired'
  | 'gateway_forbidden'

interface FundingSourceToggleProps {
  fundingSource: FundingSource
  onFundingSourceChange: (source: FundingSource) => void
  // Cloud BYOK
  selectedKeyRefId: string | null
  onKeyRefIdChange: (keyId: string) => void
  availableKeys: UserApiKey[]
  // Local BYOK — backed by the LenserFight Gateway daemon, NOT the browser.
  selectedLocalKeyId: string | null
  onLocalKeyIdChange: (keyId: string) => void
  availableLocalKeys: LocalKeyMeta[]
  /** Pass the gateway availability (`useLocalKeyStore().availability`). */
  localKeyAvailability?: LocalKeyAvailability
  onAddLocalKey: (provider: string, label: string, rawKey: string) => Promise<void>
  onRemoveLocalKey?: (id: string) => Promise<void>
  onUpdateLocalKey?: (id: string, rawKey: string, label: string) => Promise<void>
  /** Persist the bearer token from `lf gateway pair --web` (sessionStorage). */
  onPairGateway?: (token: string) => void
  onRefreshLocalKeys?: () => Promise<void> | void
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

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 rounded-lg bg-gray-900 dark:bg-gray-700 px-3 py-2 text-[11px] leading-snug text-white shadow-lg opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
      </div>
    </div>
  )
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

/**
 * Map a thrown error from the gateway client into a user-facing message.
 * The client raises `LocalKeyStoreError` with a `code` field — but the
 * generic Error shape only exposes `message`, so check both.
 */
function mapGatewayError(err: unknown, op: 'save' | 'update'): string {
  const fallback = op === 'save' ? 'Failed to save key. Please try again.' : 'Failed to update key. Please try again.'
  if (!(err instanceof Error)) return fallback
  const code =
    (err as Error & { code?: string }).code ??
    (err.message.match(/^(gateway_[a-z_]+|[a-z_]+)/)?.[1] ?? '')
  switch (code) {
    case 'gateway_not_paired':
      return 'Gateway not paired. Run `lf gateway pair --web` and paste the token.'
    case 'gateway_unreachable':
      return 'Gateway is not running. Start it with `lf gateway serve`.'
    case 'gateway_forbidden':
      return 'Gateway refused this origin. Add this URL to the allow-list, or open the app at https://lenserfight.com / a permitted origin.'
    case 'gateway_rate_limited':
      return 'Too many requests to the gateway. Wait a minute and retry.'
    case 'passphrase_missing':
      return 'No master passphrase configured. Run `lf keys init`.'
    case 'duplicate_key':
      return 'A key with this id already exists.'
    case 'invalid_provider':
    case 'invalid_key_id':
      return err.message || fallback
    default:
      return err.message ? `${fallback} (${err.message})` : fallback
  }
}

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
      setError(mapGatewayError(err, 'save'))
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
        {/* type="text" + WebKit text-security mask. Avoids the browser's
            "password fields on insecure (http://) page" warning while
            preserving over-the-shoulder masking on Chromium and Safari.
            Firefox shows cleartext when masked; users can toggle Eye to
            view explicitly. */}
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={rawKey}
          onChange={(e) => setRawKey(e.target.value)}
          placeholder={isOllama ? 'API key (optional, for cloud models)…' : 'API key…'}
          className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono ${showKey ? '' : '[-webkit-text-security:disc] [text-security:disc]'}`}
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
        Sent to the loopback gateway, encrypted at rest on your machine. Never sent to LenserFight servers.
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
      setError(mapGatewayError(err, 'update'))
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
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={rawKey}
              onChange={(e) => setRawKey(e.target.value)}
              placeholder={isOllama ? 'Leave blank to keep existing…' : 'Paste new key…'}
              className={`w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono ${showKey ? '' : '[-webkit-text-security:disc] [text-security:disc]'}`}
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

        <p className="text-[10px] text-gray-400">Sent to the loopback gateway, encrypted at rest on your machine. Never sent to LenserFight servers.</p>

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

const GATEWAY_DOCS_PATH = '/explanation/lenses/local-keys-gateway'

function GatewayUnreachablePanel({
  onRefreshLocalKeys,
}: {
  onRefreshLocalKeys?: () => Promise<void> | void
}) {
  const [rechecking, setRechecking] = useState(false)

  const handleRecheck = async () => {
    if (!onRefreshLocalKeys) return
    setRechecking(true)
    try {
      await onRefreshLocalKeys()
    } finally {
      setRechecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-900/10">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Start the LenserFight Gateway
        </p>
        <HelpButton path={GATEWAY_DOCS_PATH} label="Gateway docs" className="shrink-0" />
      </div>
      <ol className="text-[10px] text-gray-600 dark:text-gray-400 list-decimal pl-4 space-y-0.5">
        <li>
          Run <code className="text-primary-600 dark:text-primary-400">lf gateway serve</code>{' '}
          in a terminal and leave it running.
        </li>
        <li>
          Then run <code className="text-primary-600 dark:text-primary-400">lf gateway pair --web</code>{' '}
          and copy the token it prints.
        </li>
        <li>Come back to this page and paste the token into the field that appears.</li>
      </ol>
      {onRefreshLocalKeys && (
        <button
          type="button"
          onClick={() => void handleRecheck()}
          disabled={rechecking}
          className="self-start inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {rechecking ? <Loader2 size={11} className="animate-spin" /> : null}
          {rechecking ? 'Checking…' : 'Recheck gateway'}
        </button>
      )}
    </div>
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
  localKeyAvailability = 'available',
  onAddLocalKey,
  onRemoveLocalKey: _onRemoveLocalKey,
  onUpdateLocalKey,
  onPairGateway,
  onRefreshLocalKeys,
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
  const [showAddLocalKey, setShowAddLocalKey] = useState(false)
  const [editingKey, setEditingKey] = useState<LocalKeyMeta | null>(null)

  const caps = useFundingCapabilities({
    availableCloudKeyCount: availableKeys.length,
    chainabitState,
    localKeyAvailability,
  })
  const [pairToken, setPairToken] = useState('')

  // Fallback gateway client: when the parent component hasn't piped
  // `onPairGateway` through (most existing call sites still don't), the
  // toggle remains self-sufficient — it constructs its own client so the
  // pairing flow is always reachable from any page that shows this widget.
  const fallbackClient = useMemo(() => {
    if (onPairGateway) return null // parent owns it
    if (typeof window === 'undefined') return null
    return new LocalKeysGatewayClient()
  }, [onPairGateway])
  const handlePairGateway = (token: string) => {
    if (onPairGateway) {
      onPairGateway(token)
      return
    }
    if (fallbackClient) {
      fallbackClient.setToken(token)
      // Trigger a re-render in the parent's funding flow by reloading the
      // page when no refresh handler was wired. This is a last resort —
      // call sites should pass onRefreshLocalKeys to avoid the reload.
      if (onRefreshLocalKeys) {
        void onRefreshLocalKeys()
      } else if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }
  }

  const cloudByokDisabled = !canUseBYOK
  // Make the Local Keys tile selectable whenever there is *any* path forward:
  // already available, gateway running but unpaired (click → see pair UI),
  // or gateway not yet started (click → see "start the gateway" hint).
  // Only refuse the click when the origin has been forbidden — there is
  // truly nothing the user can do from this UI in that case.
  const localByokDisabled =
    !canUseBYOK || localKeyAvailability === 'gateway_forbidden'

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

  // Auto-fallback when the current funding source is unreachable. Capability-driven,
  // not edition-driven: the policy reasons about runtime signals (Web Crypto,
  // Chainabit state, key inventory) rather than build-time flags.
  useEffect(() => {
    const chainabitDefinitelyUnavailable =
      chainabitState === 'no_credits' ||
      chainabitState === 'no_account' ||
      chainabitState === 'invalid_connection' ||
      chainabitState === 'provider_error'

    if (fundingSource === 'platform_credit' && chainabitDefinitelyUnavailable) {
      if (caps.canSelectCloudByok) onFundingSourceChange('user_byok_cloud')
      else if (caps.canUseLocalByok) onFundingSourceChange('user_byok_local')
      return
    }

    // Only auto-fallback from local BYOK when the gateway has explicitly forbidden
    // this origin — there is nothing the user can do from this UI in that case.
    // gateway_not_paired and gateway_unreachable are *actionable*: the pairing UI
    // is surfaced precisely for those states, so we must stay on user_byok_local.
    if (fundingSource === 'user_byok_local' && localKeyAvailability === 'gateway_forbidden') {
      if (caps.canSelectCloudByok) onFundingSourceChange('user_byok_cloud')
      else if (caps.canUseChainabit) onFundingSourceChange('platform_credit')
    }
  }, [
    chainabitState,
    fundingSource,
    localKeyAvailability,
    caps.canSelectCloudByok,
    caps.canUseLocalByok,
    caps.canUseChainabit,
    onFundingSourceChange,
  ])

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

  const fundingDocsUrl = `${DOCS_BASE_URL}/en/explanation/lenses/funding-sources`

  // The three funding sources are independent peers: Chainabit (credit-funded),
  // LF Cloud Keys (BYOK synced via Supabase), and Local Keys (BYOK encrypted in
  // this browser via Web Crypto). They have different storage models and trust
  // boundaries, so we render them side-by-side rather than nesting Cloud / Local
  // BYOK under a shared "My Keys" parent.
  const visibleSourceCount =
    (caps.isChainabitConfigured ? 1 : 0) + 1 /* LF Cloud */ + 1 /* Local */
  const sourceGridCols = visibleSourceCount === 3 ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          Funding
        </label>
        <a
          href={fundingDocsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-primary-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more
        </a>
      </div>

      {/* Three peer funding sources. Each represents a distinct storage model:
            - Chainabit: shared credit balance held by Chainabit
            - LF Cloud Keys: BYOK keys stored encrypted in Supabase (synced across devices)
            - Local Keys: BYOK keys encrypted in this browser (IndexedDB; never leaves device) */}
      <div className={`grid gap-2 ${sourceGridCols}`}>
        {caps.isChainabitConfigured && (
          <Tooltip text="Pay for AI inference with your Chainabit credit balance. Shared across all LenserFight battles.">
            <button
              type="button"
              onClick={handleChainabitClick}
              disabled={chainabitIsDisabled}
              className={`w-full flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${isCloud && chainabitActive
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
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  Chainabit
                  <a
                    href={`${fundingDocsUrl}#chainabit-credits`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-primary-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    title="How Chainabit credits work"
                  >
                    <span className="text-[9px] leading-none border border-current rounded-full px-1">?</span>
                  </a>
                </p>
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
          </Tooltip>
        )}

        <Tooltip text="BYOK API keys stored encrypted in LenserFight Cloud (Supabase). Synced across every device you sign into.">
          <button
            type="button"
            onClick={() => onFundingSourceChange('user_byok_cloud')}
            disabled={cloudByokDisabled}
            className={`w-full flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${isByokCloud
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              } ${cloudByokDisabled ? 'opacity-60 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-600' : ''}`}
          >
            <Globe size={16} className={isByokCloud ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                LF Cloud Keys
                <a
                  href={`${fundingDocsUrl}#lf-cloud-keys-byok-cloud`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="How LF Cloud Keys work"
                >
                  <span className="text-[9px] leading-none border border-current rounded-full px-1">?</span>
                </a>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {availableKeys.length > 0
                  ? `${availableKeys.length} key${availableKeys.length > 1 ? 's' : ''}`
                  : 'Add in Settings'}
              </p>
            </div>
          </button>
        </Tooltip>

        <Tooltip text={caps.canUseLocalByok
          ? 'BYOK API keys stored encrypted at rest on your machine (~/.lenserfight/keys/), accessed via the LenserFight Gateway loopback daemon. Plaintext never leaves your computer.'
          : localKeyAvailability === 'gateway_unreachable'
            ? 'Start the LenserFight Gateway: run `lf gateway serve` in a terminal.'
            : localKeyAvailability === 'gateway_not_paired'
              ? 'Pair the gateway: run `lf gateway pair --web` and paste the token below.'
              : 'Gateway refused the request (origin blocked).'}>
          <button
            type="button"
            onClick={() => onFundingSourceChange('user_byok_local')}
            disabled={localByokDisabled}
            className={`w-full flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${isByokLocal
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              } ${localByokDisabled ? 'opacity-60 cursor-not-allowed hover:border-gray-200 dark:hover:border-gray-600' : ''}`}
          >
            <HardDrive size={16} className={isByokLocal ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                Local Keys
                <a
                  href={`${fundingDocsUrl}#local-keys-byok-local`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  title="How Local Keys work"
                >
                  <span className="text-[9px] leading-none border border-current rounded-full px-1">?</span>
                </a>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {availableLocalKeys.length > 0
                  ? `${availableLocalKeys.length} key${availableLocalKeys.length > 1 ? 's' : ''}`
                  : caps.canUseLocalByok
                    ? 'Add via `lf keys add`'
                    : localKeyAvailability === 'gateway_unreachable'
                      ? 'Gateway off'
                      : localKeyAvailability === 'gateway_not_paired'
                        ? 'Not paired'
                        : 'Unavailable'}
              </p>
            </div>
          </button>
        </Tooltip>
      </div>

      {/* Row 3: Key selector */}
      {isByokCloud && availableKeys.length > 0 && (
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

      {caps.canUseLocalByok && isByokLocal && availableLocalKeys.length > 0 && !showAddLocalKey && (
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
            Stored encrypted on your machine. Resolved on demand through the loopback gateway.
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

      {/* Pair the gateway. Visible whenever the user has switched to Local Keys
          but no bearer token is paired with this origin. The pair input is the
          only place to paste the token from `lf gateway pair --web` — keep
          the instructions explicit so users can't miss the connection. */}
      {isByokLocal && localKeyAvailability === 'gateway_not_paired' && (
        <div className="flex flex-col gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Paste your pairing token below ↓
          </p>
          <ol className="text-[10px] text-gray-600 dark:text-gray-400 list-decimal pl-4 space-y-0.5">
            <li>
              In a terminal on the gateway machine, run{' '}
              <code className="text-primary-600 dark:text-primary-400">lf gateway pair --web</code>
            </li>
            <li>Copy the token printed on the next line</li>
            <li>Paste it into the field below and click <strong>Pair gateway</strong></li>
          </ol>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={pairToken}
            onChange={(e) => setPairToken(e.target.value)}
            onPaste={(e) => {
              // Friendly: auto-pair on paste if the field is empty
              const pasted = e.clipboardData.getData('text').trim()
              if (pasted && !pairToken.trim()) {
                e.preventDefault()
                setPairToken(pasted)
              }
            }}
            placeholder="Paste pairing token here…"
            aria-label="LenserFight Gateway pairing token"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono [-webkit-text-security:disc] [text-security:disc]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const trimmed = pairToken.trim()
                if (!trimmed) return
                handlePairGateway(trimmed)
                setPairToken('')
              }}
              disabled={!pairToken.trim()}
              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              Pair gateway
            </button>
            {onRefreshLocalKeys && (
              <button
                type="button"
                onClick={() => {
                  void onRefreshLocalKeys()
                }}
                className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Recheck
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            The token is held in this browser tab only (sessionStorage). Close the tab and you'll need to pair again.
          </p>
        </div>
      )}

      {/* Gateway not running */}
      {isByokLocal && localKeyAvailability === 'gateway_unreachable' && (
        <GatewayUnreachablePanel onRefreshLocalKeys={onRefreshLocalKeys} />
      )}

      {/* Gateway forbids this origin */}
      {isByokLocal && localKeyAvailability === 'gateway_forbidden' && (
        <p className="text-xs text-red-500">
          The gateway refused this origin (<code>{typeof window !== 'undefined' ? window.location.origin : ''}</code>).{' '}
          Add it to the allow-list with{' '}
          <code>LF_GATEWAY_EXTRA_ORIGINS</code> or open the web app from a permitted URL.
        </p>
      )}

      {/* Add-a-key hint: the gateway is paired but no keys are stored yet. */}
      {caps.canUseLocalByok && isByokLocal && availableLocalKeys.length === 0 && !showAddLocalKey && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No local keys yet. Add one with the CLI: <code>lf keys add --provider openai</code>.
          </p>
          <button
            type="button"
            onClick={() => setShowAddLocalKey(true)}
            className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
          >
            <Plus size={12} />
            Add from the browser instead
          </button>
        </div>
      )}

      {/* Row 4: Inline add local key form — still available as a fallback for users
          who'd rather paste a key into the browser. The plaintext is sent to the
          gateway over loopback; it never reaches LenserFight servers. */}
      {caps.canUseLocalByok && isByokLocal && availableLocalKeys.length > 0 && !showAddLocalKey && (
        <button
          type="button"
          onClick={() => setShowAddLocalKey(true)}
          className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
        >
          <Plus size={12} />
          Add another key
        </button>
      )}

      {caps.canUseLocalByok && isByokLocal && showAddLocalKey && (
        <AddLocalKeyForm
          onAdd={onAddLocalKey}
          onCancel={() => setShowAddLocalKey(false)}
        />
      )}

      {/* Cloud BYOK — no keys hint */}
      {isByokCloud && availableKeys.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No cloud API keys.{' '}
          <Link to="/settings/api-keys" className="text-primary-600 dark:text-primary-400 hover:underline">
            Add one in Settings
          </Link>
        </p>
      )}

      {/* Low balance hint */}
      {isCloud && chainabitState === 'no_credits' && (
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
          chainabitConnected={caps.canUseChainabit}
          chainabitLoading={chainabitState === 'loading'}
        />
      )}
    </div>
  )
}
