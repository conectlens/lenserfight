import React, { useState } from 'react'
import { usePartnerConnection } from '@lenserfight/features/store'
import { partnerProvisioningRepository } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'

const REGISTERED_PARTNERS = [
  { name: 'chainabit', displayName: 'Chainabit' },
] as const

interface PartnerCardProps {
  partnerName: string
  displayName: string
}

function PartnerCard({ partnerName, displayName }: PartnerCardProps) {
  const [claimSent, setClaimSent] = useState(false)
  const [isSendingClaim, setIsSendingClaim] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { state, credits, invalidate } = usePartnerConnection(partnerName)

  const isLoading = state === 'loading'
  const isConnected = state === 'connected' || state === 'no_credits'

  const handleConnect = async () => {
    await partnerProvisioningRepository.startOAuthConnect(window.location.href)
  }

  const handleSendClaim = async () => {
    setIsSendingClaim(true)
    try {
      await partnerProvisioningRepository.sendClaimEmail(partnerName)
      setClaimSent(true)
    } catch {
      // Silently fail — not blocking UX
    } finally {
      setIsSendingClaim(false)
    }
  }

  const handleRefreshToken = async () => {
    setIsRefreshing(true)
    try {
      await partnerProvisioningRepository.refreshToken(partnerName)
      await invalidate()
    } catch {
      // Silently fail
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Not connected</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            Inactive
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Connect your {displayName} account to use wallet credits for AI battles.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          By connecting, you agree to {displayName}&apos;s{' '}
          <a href="https://chainabit.com/policy/terms" target="_blank" rel="noopener noreferrer"
             className="underline text-blue-500 hover:text-blue-600">Terms of Service</a>,{' '}
          <a href="https://chainabit.com/policy/cookies" target="_blank" rel="noopener noreferrer"
             className="underline text-blue-500 hover:text-blue-600">Cookie Policy</a>, and{' '}
          <a href="https://chainabit.com/policy/privacy" target="_blank" rel="noopener noreferrer"
             className="underline text-blue-500 hover:text-blue-600">Privacy Policy</a>.
        </p>
        <Button
          variant="secondary"
          className="!w-auto px-4 text-xs"
          onClick={handleConnect}
        >
          Connect {displayName}
        </Button>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Connected partner account</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
          Active
        </span>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Credit Balance</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
            {credits != null ? credits.toLocaleString() : '—'}
            <span className="text-sm font-normal text-gray-400 ml-1">cr</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="secondary"
          className="!w-auto px-4 text-xs"
          onClick={handleSendClaim}
          isLoading={isSendingClaim}
          disabled={claimSent || isSendingClaim}
        >
          {claimSent ? 'Claim email sent' : `Claim ${displayName} account`}
        </Button>
        <Button
          variant="ghost"
          className="!w-auto px-4 text-xs"
          onClick={handleRefreshToken}
          isLoading={isRefreshing}
          disabled={isRefreshing}
        >
          Refresh token
        </Button>
      </div>
    </div>
  )
}

export function PartnerAccountsTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connected Accounts</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        Optionally connect partner accounts to unlock additional features like wallet credits for AI battles.
      </p>

      <div className="space-y-4">
        {REGISTERED_PARTNERS.map((p) => (
          <PartnerCard key={p.name} partnerName={p.name} displayName={p.displayName} />
        ))}
      </div>
    </div>
  )
}
