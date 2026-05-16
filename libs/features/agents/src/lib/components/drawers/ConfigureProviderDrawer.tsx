import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ProviderConfigRecord } from '@lenserfight/types'
import { Button, Tooltip } from '@lenserfight/ui/components'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, HelpCircle, XCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

export interface ProviderInfo {
  key: string
  name: string
  status?: 'healthy' | 'error' | 'unconfigured'
  config?: ProviderConfigRecord | null
}

interface ConfigureProviderDrawerProps {
  open: boolean
  onClose: () => void
  provider: ProviderInfo
  aiLenserId: string
}

export const ConfigureProviderDrawer: React.FC<ConfigureProviderDrawerProps> = ({
  open,
  onClose,
  provider,
  aiLenserId,
}) => {
  const queryClient = useQueryClient()

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [healthMessage, setHealthMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setApiKey('')
    setBaseUrl(provider.config?.base_url ?? '')
    setHealthStatus('idle')
    setHealthMessage('')
    setError(null)
    setSaved(false)
  }, [open, provider.key])

  const handleHealthCheck = async () => {
    setHealthStatus('checking')
    setHealthMessage('')
    try {
      const result = await agentWorkspaceService.testProvider(aiLenserId, provider.key)
      setHealthStatus(result.status === 'healthy' ? 'ok' : 'error')
      setHealthMessage(result.message)
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.providers(aiLenserId),
      })
    } catch (err) {
      setHealthStatus('error')
      setHealthMessage((err as Error).message ?? 'Health check failed.')
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await agentWorkspaceService.configureProvider(
        aiLenserId,
        provider.key,
        apiKey,
        baseUrl.trim() || null
      )
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.providers(aiLenserId),
      })
      setSaved(true)
    } catch (err) {
      setError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[500px]"
      title={`Configure ${provider.name}`}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/configure-provider"
          tip="Bind API key and optional base URL for one provider. Keys are encrypted via Supabase Vault — only the last 4 chars are echoed back after save. Run a health check to verify connectivity before closing."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : 'Save'}
          isLoading={submitting}
          disabled={submitting || !apiKey.trim()}
        />
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
            provider key:{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {provider.key}
            </span>
          </p>
          {provider.config?.configured_at && (
            <p className="mt-1 font-mono text-xs text-gray-400 dark:text-gray-500">
              configured: {new Date(provider.config.configured_at).toLocaleString()}
            </p>
          )}
        </div>

        <FieldLabel
          label="API Key"
          tooltip="Stored in Supabase Vault — encrypted at rest, never logged, and never exposed in responses. Only the last four characters are echoed back after save. Leave blank to keep the existing key."
        >
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-… or leave blank to keep existing"
            autoComplete="off"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">
            Stored securely via Supabase Vault. Never logged or exposed in responses.
          </p>
        </FieldLabel>

        <FieldLabel
          label="Base URL (optional)"
          tooltip="Override the provider's default API endpoint. Required for self-hosted deployments, proxies, or private cloud configurations. Leave blank to use the official provider URL."
        >
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1 (for self-hosted)"
            className={inputClass}
          />
        </FieldLabel>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleHealthCheck}
            disabled={healthStatus === 'checking'}
          >
            {healthStatus === 'checking' ? 'Checking…' : 'Health check'}
          </Button>
          {healthStatus === 'ok' && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={15} /> {healthMessage}
            </span>
          )}
          {healthStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <XCircle size={15} /> {healthMessage}
            </span>
          )}
        </div>

        {saved && (
          <p className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200">
            Provider configuration saved.
          </p>
        )}

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  children: React.ReactNode
}> = ({ label, tooltip, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {tooltip && (
        <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
          <HelpCircle
            size={12}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`${label} — help`}
          />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)
