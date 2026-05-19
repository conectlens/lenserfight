import React from 'react'
import { AlertCircle, ExternalLink, Loader2, LogOut, PlugZap, Zap } from 'lucide-react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import type { ChainabitAiModel, PartnerConnectionState } from '@lenserfight/types'

interface ChainabitModalProps {
  isOpen: boolean
  onClose: () => void
  state: PartnerConnectionState
  credits: number | null
  models: ChainabitAiModel[] | null
  onReconnect: () => Promise<void>
  onSignOut?: () => void
  topUpUrl: string
}

type ConnectErrorKind = 'session_expired' | 'generic'

function classifyConnectError(err: unknown): ConnectErrorKind {
  if (err && typeof err === 'object') {
    const code = (err as Record<string, unknown>)['code']
    if (code === 'user_not_found') return 'session_expired'
  }
  if (err instanceof Error && err.message.toLowerCase().includes('user from sub claim')) {
    return 'session_expired'
  }
  return 'generic'
}

function ChainabitLogo() {
  return (
    <img
      src="https://cdn.lenserfight.com/brand/chainabit/favicon-32x32.png"
      width={28}
      height={28}
      alt="Chainabit"
      className="rounded shrink-0"
    />
  )
}

function CapabilityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
      {label}
    </span>
  )
}

function ModelRow({ model }: { model: ChainabitAiModel }) {
  return (
    <li className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{model.name}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{model.modelKey}</p>
      </div>
      <div className="flex flex-wrap gap-1 justify-end">
        {model.capabilities.slice(0, 3).map((cap) => (
          <CapabilityChip key={cap} label={cap} />
        ))}
      </div>
    </li>
  )
}

const isConnectState = (state: PartnerConnectionState) => state === 'not_connected'
const isReconnectState = (state: PartnerConnectionState) =>
  state === 'token_expired' || state === 'insufficient_scope'
const isAccountConnected = (state: PartnerConnectionState) =>
  state === 'connected' || state === 'no_credits'

export const ChainabitModal: React.FC<ChainabitModalProps> = ({
  isOpen,
  onClose,
  state,
  credits,
  models,
  onReconnect,
  onSignOut,
  topUpUrl,
}) => {
  const [reconnecting, setReconnecting] = React.useState(false)
  const [connectError, setConnectError] = React.useState<ConnectErrorKind | null>(null)

  const handleReconnect = async () => {
    setConnectError(null)
    setReconnecting(true)
    try {
      await onReconnect()
    } catch (err) {
      setConnectError(classifyConnectError(err))
    } finally {
      setReconnecting(false)
    }
  }

  const title =
    isConnectState(state) ? 'Connect Chainabit' :
      isReconnectState(state) ? 'Reconnect Chainabit' :
        state === 'no_credits' ? 'No credits remaining' :
          state === 'provider_error' ? 'Connection error' :
            'Chainabit'

  const footer = (() => {
    if (state === 'loading') return undefined

    if (isConnectState(state)) {
      return (
        <ModalFooter
          border={false}
          leftButton={{ label: 'Cancel', onClick: onClose, variant: 'secondary', className: 'flex-1' }}
          primaryButton={{
            label: reconnecting ? 'Redirecting…' : 'Connect Chainabit',
            onClick: handleReconnect,
            isLoading: reconnecting,
            className: 'flex-1',
          }}
        />
      )
    }

    if (isReconnectState(state)) {
      return (
        <ModalFooter
          border={false}
          leftButton={{ label: 'Cancel', onClick: onClose, variant: 'secondary', className: 'flex-1' }}
          primaryButton={{
            label: reconnecting ? 'Redirecting…' : 'Reconnect',
            onClick: handleReconnect,
            isLoading: reconnecting,
            className: 'flex-1',
          }}
        />
      )
    }

    if (state === 'no_credits') {
      return (
        <ModalFooter
          border={false}
          leftButton={{ label: 'Close', onClick: onClose, variant: 'secondary', className: 'flex-1' }}
          primaryButton={{
            label: 'Top up on Chainabit',
            onClick: () => window.open(topUpUrl, '_blank', 'noopener,noreferrer'),
            className: 'flex-1',
          }}
        />
      )
    }

    if (state === 'connected') {
      return (
        <ModalFooter
          border={false}
          leftButton={{ label: 'Close', onClick: onClose, variant: 'secondary' }}
          primaryButton={{
            label: 'Top up',
            onClick: () => window.open(topUpUrl, '_blank', 'noopener,noreferrer'),
          }}
        />
      )
    }

    // provider_error or any unknown state — just close
    return (
      <ModalFooter
        border={false}
        primaryButton={{ label: 'Close', onClick: onClose, variant: 'secondary' }}
      />
    )
  })()

  return (
    <Dialog
      open={isOpen}
      onClose={() => { setConnectError(null); onClose() }}
      title={title}
      icon={<ChainabitLogo />}
      maxWidth="max-w-md"
      footer={footer}
    >
      {connectError === 'session_expired' && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-3">
          <LogOut size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Session expired</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
              Your session is no longer valid. Sign out and sign in again to reconnect Chainabit.
            </p>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="mt-2 text-xs font-medium text-red-700 dark:text-red-300 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-100"
              >
                Sign out now
              </button>
            )}
          </div>
        </div>
      )}

      {connectError === 'generic' && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">Connection failed</p>
            <p className="mt-0.5 text-xs text-red-700 dark:text-red-400">
              Could not initiate the Chainabit OAuth flow. Please try again or contact support if the issue persists.
            </p>
          </div>
        </div>
      )}

      <div className="flex mb-3">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          Experimental
        </span>
      </div>

      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {isConnectState(state) && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Connect your Chainabit account to run AI battles using your Chainabit wallet credits.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Chainabit is the AI execution runtime that powers LenserFight.
          </p>
        </div>
      )}

      {isReconnectState(state) && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Your Chainabit connection has expired or been revoked. Reconnect to restore access.
          </p>
        </div>
      )}

      {state === 'provider_error' && (
        <div className="text-center py-4 space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 mx-auto">
            <AlertCircle size={22} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Could not reach Chainabit. Please try again later.
          </p>
        </div>
      )}

      {isAccountConnected(state) && (
        <div className="space-y-4">
          <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
            state === 'no_credits'
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {state === 'no_credits' ? (
                <Zap size={14} className="text-orange-500" />
              ) : (
                <PlugZap size={14} className="text-green-600 dark:text-green-400" />
              )}
              <span className={`text-xs font-medium ${
                state === 'no_credits'
                  ? 'text-orange-800 dark:text-orange-300'
                  : 'text-green-800 dark:text-green-300'
              }`}>
                {state === 'no_credits' ? 'No credits' : 'Connected'}
              </span>
            </div>
            <span className={`text-sm font-bold tabular-nums ${
              state === 'no_credits'
                ? 'text-orange-900 dark:text-orange-200'
                : 'text-green-900 dark:text-green-200'
            }`}>
              {credits?.toLocaleString() ?? '0'} cr
            </span>
          </div>

          {state === 'no_credits' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your Chainabit wallet is empty. Top up to continue running AI battles.
            </p>
          )}

          {models && models.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Available models
              </p>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {models.map((m) => (
                  <ModelRow key={m.modelKey} model={m} />
                ))}
              </ul>
            </div>
          )}

          <a
            href={topUpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline"
          >
            <ExternalLink size={12} />
            Top up on Chainabit
          </a>
        </div>
      )}
    </Dialog>
  )
}
