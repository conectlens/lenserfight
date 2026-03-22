import React from 'react'
import { Cloud, KeyRound } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { FundingSource, UserApiKey, WalletBalance, BYOK_PROVIDER_LABELS } from '@lenserfight/types'
import { Link } from 'react-router-dom'

interface FundingSourceToggleProps {
  fundingSource: FundingSource
  onFundingSourceChange: (source: FundingSource) => void
  selectedKeyRefId: string | null
  onKeyRefIdChange: (keyId: string) => void
  availableKeys: UserApiKey[]
  walletBalance: WalletBalance | undefined
  canUseBYOK: boolean
}

export const FundingSourceToggle: React.FC<FundingSourceToggleProps> = ({
  fundingSource,
  onFundingSourceChange,
  selectedKeyRefId,
  onKeyRefIdChange,
  availableKeys,
  walletBalance,
  canUseBYOK,
}) => {
  const isCloud = fundingSource === 'platform_credit'
  const isByok = fundingSource === 'user_byok_cloud'

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        Funding
      </label>
      <div className="grid grid-cols-2 gap-2">
        {/* Cloud Credits */}
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

        {/* BYOK */}
        <button
          type="button"
          onClick={() => canUseBYOK && onFundingSourceChange('user_byok_cloud')}
          disabled={!canUseBYOK}
          className={`flex items-center gap-2 p-3 border rounded-lg transition-all text-left ${
            isByok
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : canUseBYOK
                ? 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                : 'border-gray-100 dark:border-gray-700 opacity-50 cursor-not-allowed'
          }`}
        >
          <KeyRound size={16} className={isByok ? 'text-gray-900 dark:text-white' : 'text-gray-400'} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">My Key</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {canUseBYOK ? `${availableKeys.length} key${availableKeys.length > 1 ? 's' : ''}` : 'No keys'}
            </p>
          </div>
        </button>
      </div>

      {/* Key selector when BYOK is active */}
      {isByok && availableKeys.length > 0 && (
        <SelectField
          value={selectedKeyRefId ?? ''}
          onChange={onKeyRefIdChange}
          placeholder="Select an API key"
          options={availableKeys.map((k) => ({
            value: k.id,
            label: `${BYOK_PROVIDER_LABELS[k.provider]}${k.label ? ` — ${k.label}` : ''} (••••${k.keySuffix})`,
          }))}
        />
      )}

      {/* No keys hint */}
      {isByok && availableKeys.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No API keys added.{' '}
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
