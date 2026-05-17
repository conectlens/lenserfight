/**
 * OAuthConnectionsSection — displays the user's Google OAuth connections in settings.
 *
 * Shows one card per Google capability (Gmail, Drive, Sheets, Docs, Calendar).
 * Each card shows the connection status, label, and expiry, with Connect/Revoke actions.
 * Handles the ?connected=<capability> and ?error=<reason> URL params from the OAuth callback.
 */

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle, Link2, Unlink, Loader2 } from 'lucide-react'
import { GOOGLE_CAPABILITIES } from '@lenserfight/domain/oauth-connections'
import type { OAuthCapability, UserOAuthConnection } from '@lenserfight/domain/oauth-connections'
import { useOAuthConnections } from '../hooks/useOAuthConnections'

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string
  variant: 'success' | 'error'
  onDismiss: () => void
}

function Toast({ message, variant, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border
        ${variant === 'success'
          ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
        }`}
    >
      {variant === 'success' ? (
        <CheckCircle size={16} className="shrink-0" />
      ) : (
        <AlertCircle size={16} className="shrink-0" />
      )}
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

// ── Capability card ───────────────────────────────────────────────────────────

interface CapabilityCardProps {
  capability: OAuthCapability
  displayName: string
  description: string
  connection: UserOAuthConnection | undefined
  onConnect: (capability: OAuthCapability) => void
  onRevoke: (connectionId: string) => void
  isRevoking: boolean
}

function CapabilityCard({
  capability,
  displayName,
  description,
  connection,
  onConnect,
  onRevoke,
  isRevoking,
}: CapabilityCardProps) {
  const isConnected = connection?.isActive === true

  const expiryLabel = () => {
    if (!connection?.expiresAt) return null
    const expiresAt = new Date(connection.expiresAt)
    if (expiresAt < new Date()) {
      return <span className="text-red-500 dark:text-red-400 text-xs">Token expired</span>
    }
    return null
  }

  return (
    <div className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        <div className="shrink-0">
          {isConnected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
              <CheckCircle size={11} />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
              Not connected
            </span>
          )}
        </div>
      </div>

      {isConnected && connection && (
        <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <span>Ref: <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-gray-600 dark:text-gray-300">{connection.ref}</code></span>
          {expiryLabel()}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {isConnected ? (
          <button
            type="button"
            disabled={isRevoking}
            onClick={() => connection && onRevoke(connection.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRevoking ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Unlink size={12} />
            )}
            Revoke
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(capability)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:border-primary dark:hover:text-primary transition-colors"
          >
            <Link2 size={12} />
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export function OAuthConnectionsSection() {
  const { connections, isLoading, connect, revoke, isRevoking } = useOAuthConnections()
  const location = useLocation()
  const navigate = useNavigate()

  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  // Handle ?connected=<capability> and ?error=<reason> from OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const connected = params.get('connected')
    const errorParam = params.get('error')

    if (connected) {
      const capDef = GOOGLE_CAPABILITIES.find((c) => c.capability === connected)
      const name = capDef?.displayName ?? connected
      setToast({ message: `${name} connected successfully.`, variant: 'success' })
      // Clean up URL without re-navigating
      const next = new URLSearchParams(params)
      next.delete('connected')
      navigate({ search: next.toString() }, { replace: true })
    } else if (errorParam) {
      setToast({
        message: errorParam === 'access_denied'
          ? 'Connection cancelled.'
          : `Connection failed: ${errorParam}`,
        variant: 'error',
      })
      const next = new URLSearchParams(params)
      next.delete('error')
      navigate({ search: next.toString() }, { replace: true })
    }
  // Run only once on mount (and whenever location.search changes from a redirect)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search])

  const getConnection = (capability: OAuthCapability) =>
    connections.find((c) => c.capability === capability && c.isActive)

  return (
    <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Google Connections</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Connect your Google account to use Gmail, Sheets, Drive, Docs, and Calendar in Workflows and Agents.
          </p>
        </div>
      </div>

      {toast && (
        <div className="mb-4">
          <Toast
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOOGLE_CAPABILITIES.map((cap) => (
            <CapabilityCard
              key={cap.capability}
              capability={cap.capability}
              displayName={cap.displayName}
              description={cap.description}
              connection={getConnection(cap.capability)}
              onConnect={connect}
              onRevoke={revoke}
              isRevoking={isRevoking}
            />
          ))}
        </div>
      )}
    </div>
  )
}
