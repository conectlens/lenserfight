import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChainabitCapabilities } from '@lenserfight/features/store'
import { connectorApiClient } from '@lenserfight/infra/partner-provisioning'
import { Button } from '@lenserfight/ui/components'

// Statically-known capability connectors.  Add new entries when more OAuth
// providers are supported (each uses the same connect/disconnect flow).
const REGISTERED_CONNECTORS = [
  { id: 'chainabit', displayName: 'Chainabit' },
] as const

// ---------------------------------------------------------------------------

function ChainabitCard() {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const { state, credits, reconnect, invalidate } = useChainabitCapabilities()

  const isLoading = state === 'loading'
  const isConnected = state === 'connected' || state === 'no_credits'
  const needsReconnect = state === 'token_expired' || state === 'insufficient_scope'
  const hasIdentityConflict = state === 'identity_conflict'

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await connectorApiClient.disconnect()
      await invalidate()
    } catch {
      // Non-blocking
    } finally {
      setIsDisconnecting(false)
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
            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              Chainabit
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Experimental
              </span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {hasIdentityConflict
                ? 'Linked to another account'
                : needsReconnect
                  ? 'Reconnect required'
                  : 'Not connected'}
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
            {needsReconnect ? 'Expired' : 'Inactive'}
          </span>
        </div>

        {hasIdentityConflict ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This Chainabit account is already linked to another LenserFight user. Sign in with that
            account or use a different Chainabit login.
          </p>
        ) : needsReconnect ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Your Chainabit session has expired. Reconnect to restore wallet access.
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect your Chainabit account to use your wallet credits for AI battles.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              By connecting, you agree to Chainabit&apos;s{' '}
              <a href="https://chainabit.com/policies/terms" target="_blank" rel="noopener noreferrer"
                 className="underline text-blue-500 hover:text-blue-600">Terms of Service</a>,{' '}
              <a href="https://chainabit.com/policies/cookies" target="_blank" rel="noopener noreferrer"
                 className="underline text-blue-500 hover:text-blue-600">Cookie Policy</a>, and{' '}
              <a href="https://chainabit.com/policies/privacy" target="_blank" rel="noopener noreferrer"
                 className="underline text-blue-500 hover:text-blue-600">Privacy Policy</a>.
            </p>
          </>
        )}

        {!hasIdentityConflict && (
          <Button
            variant="secondary"
            className="!w-auto px-4 text-xs"
            onClick={reconnect}
          >
            {needsReconnect ? 'Reconnect Chainabit' : 'Connect Chainabit'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
              Chainabit
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Experimental
              </span>
            </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Connected via OAuth</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
          Active
        </span>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Wallet Balance</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums mt-0.5">
            {credits != null ? credits.toLocaleString() : '—'}
            <span className="text-sm font-normal text-gray-400 ml-1">cr</span>
          </p>
        </div>
        <a
          href="https://chainabit.com/wallet"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-600 underline"
        >
          Manage wallet
        </a>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="ghost"
          className="!w-auto px-4 text-xs text-red-500 hover:text-red-600"
          onClick={handleDisconnect}
          isLoading={isDisconnecting}
          disabled={isDisconnecting}
        >
          Disconnect
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PartnerAccountsTab() {
  const navigate = useNavigate()
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('partner_connected')
    if (connected) {
      setConnectionMessage(`${connected} connected successfully.`)
      const next = new URLSearchParams(params)
      next.delete('partner_connected')
      navigate({ search: next.toString() }, { replace: true })
    }
  }, [navigate])

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connected Accounts</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-800 pb-6">
        Connect provider accounts to unlock wallet credits and AI capabilities for battles.
      </p>

      {connectionMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-300">
          {connectionMessage}
        </div>
      )}

      <div className="space-y-4">
        {REGISTERED_CONNECTORS.map((c) => {
          if (c.id === 'chainabit') return <ChainabitCard key={c.id} />
          return null
        })}
      </div>
    </div>
  )
}
