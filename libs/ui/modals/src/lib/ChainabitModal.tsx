import React from 'react'
import { ExternalLink, Loader2, PlugZap, Zap } from 'lucide-react'
import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import type { ChainabitAiModel, ChainabitConnectionState } from '@lenserfight/types'

interface ChainabitModalProps {
  isOpen: boolean
  onClose: () => void
  state: ChainabitConnectionState
  credits: number | null
  models: ChainabitAiModel[] | null
  onReconnect: () => Promise<void>
  topUpUrl: string
}

function ChainabitLogo() {
  return (
    <img
      src="/chainabit/favicon-32x32.png"
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

export const ChainabitModal: React.FC<ChainabitModalProps> = ({
  isOpen,
  onClose,
  state,
  credits,
  models,
  onReconnect,
  topUpUrl,
}) => {
  const [reconnecting, setReconnecting] = React.useState(false)

  const handleReconnect = async () => {
    setReconnecting(true)
    try {
      await onReconnect()
    } finally {
      setReconnecting(false)
    }
  }

  const title =
    state === 'no_account' ? 'Connect Chainabit' :
    state === 'invalid_connection' ? 'Reconnect Chainabit' :
    state === 'no_credits' ? 'No credits remaining' :
    'Chainabit'

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      icon={<ChainabitLogo />}
      maxWidth="max-w-md"
      footer={
        state === 'loading' ? undefined :
        state === 'no_account' || state === 'invalid_connection' ? (
          <ModalFooter
            border={false}
            leftButton={{ label: 'Cancel', onClick: onClose, variant: 'secondary', className: 'flex-1' }}
            primaryButton={{
              label: reconnecting ? 'Redirecting…' : (state === 'invalid_connection' ? 'Reconnect' : 'Connect Chainabit'),
              onClick: handleReconnect,
              isLoading: reconnecting,
              className: 'flex-1',
            }}
          />
        ) : state === 'no_credits' ? (
          <ModalFooter
            border={false}
            leftButton={{ label: 'Close', onClick: onClose, variant: 'secondary', className: 'flex-1' }}
            primaryButton={{
              label: 'Top up on Chainabit',
              onClick: () => window.open(topUpUrl, '_blank', 'noopener,noreferrer'),
              className: 'flex-1',
            }}
          />
        ) : (
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
    >
      {state === 'loading' && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      )}

      {state === 'no_account' && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Connect your Chainabit account to run AI battles using your Chainabit wallet credits.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Chainabit is the AI execution runtime that powers LenserFight.
          </p>
        </div>
      )}

      {state === 'invalid_connection' && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Your Chainabit connection has expired or been revoked. Reconnect to restore access.
          </p>
        </div>
      )}

      {state === 'no_credits' && (
        <div className="text-center py-4 space-y-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 mx-auto">
            <Zap size={22} className="text-orange-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Your Chainabit wallet has no credits. Top up to continue running AI battles.
          </p>
        </div>
      )}

      {state === 'connected' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <PlugZap size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-800 dark:text-green-300">Connected</span>
            </div>
            <span className="text-sm font-bold text-green-900 dark:text-green-200 tabular-nums">
              {credits?.toLocaleString() ?? '—'} cr
            </span>
          </div>

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
