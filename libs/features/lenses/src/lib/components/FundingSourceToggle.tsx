import React, { useEffect, useState } from 'react'
import { Cloud, KeyRound, HardDrive, Globe, Plus, X, Eye, EyeOff } from 'lucide-react'
import { SearchSelectField, SelectField } from '@lenserfight/ui/forms'
import { FundingSource, UserApiKey, WalletBalance, BYOK_PROVIDER_LABELS } from '@lenserfight/types'
import { Link } from 'react-router-dom'
import type { LocalKeyMeta } from '@lenserfight/types'

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
  // Common
  walletBalance: WalletBalance | undefined
  canUseBYOK: boolean
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

  const isOllama = provider === 'ollama'

  const handleSave = async () => {
    if (!provider) return
    setSaving(true)
    try {
      await onAdd(provider, label || provider, isOllama ? '' : rawKey)
      onCancel()
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

      {!isOllama && (
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={rawKey}
            onChange={(e) => setRawKey(e.target.value)}
            placeholder="API key…"
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
      )}

      {isOllama && (
        <p className="text-[10px] text-gray-400">
          Ollama runs locally — no API key required.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !provider || (!isOllama && !rawKey)}
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
  walletBalance,
  canUseBYOK,
}) => {
  const isCloud = fundingSource === 'platform_credit'
  const isByokCloud = fundingSource === 'user_byok_cloud'
  const isByokLocal = fundingSource === 'user_byok_local'
  const isByok = isByokCloud || isByokLocal
  const [showAddLocalKey, setShowAddLocalKey] = useState(false)

  // Redirect any persisted 'user_byok_local' state to cloud since local keys are disabled
  useEffect(() => {
    if (isByokLocal) onFundingSourceChange('user_byok_cloud')
  }, [isByokLocal, onFundingSourceChange])

  const handleMyKeyClick = () => {
    if (!canUseBYOK) return
    onFundingSourceChange('user_byok_cloud')
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Funding
      </label>

      {/* Row 1: Cloud | My Key */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onFundingSourceChange('platform_credit')}
          className={`flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${
            isCloud
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
          }`}
        >
          <Cloud size={16} className={isCloud ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">Cloud</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 tabular-nums">
              {walletBalance != null ? `${walletBalance.balance.toLocaleString()} cr` : '—'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={handleMyKeyClick}
          className={`flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${
            isByok
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
          }`}
        >
          <KeyRound size={16} className={isByok ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">My Key</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {availableKeys.length + availableLocalKeys.length > 0
                ? `${availableKeys.length + availableLocalKeys.length} key${availableKeys.length + availableLocalKeys.length > 1 ? 's' : ''}`
                : 'Add a key'}
            </p>
          </div>
        </button>
      </div>

      {/* Row 2: Cloud Keys | Local Keys sub-mode (visible when isByok) */}
      {(isByokCloud || isByokLocal) && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onFundingSourceChange('user_byok_cloud')}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all ${
              isByokCloud
                ? 'border-primary bg-primary/5 ring-1 ring-primary font-semibold text-gray-900 dark:text-gray-100'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Globe size={12} />
            Cloud Keys
            {availableKeys.length > 0 && (
              <span className="ml-auto text-[10px] text-gray-400">{availableKeys.length}</span>
            )}
          </button>

          <button
            type="button"
            disabled
            className="relative flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs transition-all border-gray-100 dark:border-gray-700 text-gray-400 opacity-60 cursor-not-allowed"
          >
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Coming Soon
            </span>
            <HardDrive size={12} />
            Local Keys
          </button>
        </div>
      )}

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

      {isByokLocal && availableLocalKeys.length > 0 && !showAddLocalKey && (
        <div className="flex flex-col gap-1.5">
          <SearchSelectField
            value={selectedLocalKeyId ?? ''}
            onChange={onLocalKeyIdChange}
            placeholder="Select a local key"
            options={availableLocalKeys.map((k) => ({
              value: k.id,
              label: `${BYOK_PROVIDER_LABELS[k.provider as keyof typeof BYOK_PROVIDER_LABELS] ?? k.provider}${k.label && k.label !== k.provider ? ` — ${k.label}` : ''}`,
            }))}
          />
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            Encrypted in your browser. Never sent to our servers.
          </p>
        </div>
      )}

      {/* Row 4: Inline add local key form */}
      {isByokLocal && !showAddLocalKey && (
        <button
          type="button"
          onClick={() => setShowAddLocalKey(true)}
          className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline self-start"
        >
          <Plus size={12} />
          {availableLocalKeys.length === 0 ? 'Add a local key' : 'Add another key'}
        </button>
      )}

      {isByokLocal && showAddLocalKey && (
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
      {isCloud && walletBalance != null && walletBalance.balance <= 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No credits remaining.{' '}
          <Link to="/billing" className="hover:underline">
            Add credits
          </Link>
        </p>
      )}
    </div>
  )
}
