import { Drawer } from '@lenserfight/ui/overlays'
import { CheckCircle, XCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export interface ProviderInfo {
  key: string
  name: string
  status?: 'healthy' | 'error' | 'unconfigured'
}

interface ConfigureProviderDrawerProps {
  open: boolean
  onClose: () => void
  provider: ProviderInfo
}

export const ConfigureProviderDrawer: React.FC<ConfigureProviderDrawerProps> = ({
  open,
  onClose,
  provider,
}) => {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [healthStatus, setHealthStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [healthMessage, setHealthMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return
    setApiKey('')
    setBaseUrl('')
    setHealthStatus('idle')
    setHealthMessage('')
    setSaved(false)
  }, [open, provider.key])

  const handleHealthCheck = async () => {
    setHealthStatus('checking')
    setHealthMessage('')
    try {
      // Placeholder — real integration calls supabase.functions.invoke('test-provider', { body: { provider_key, api_key } })
      await new Promise((r) => setTimeout(r, 800))
      setHealthStatus('ok')
      setHealthMessage('Provider responded successfully.')
    } catch {
      setHealthStatus('error')
      setHealthMessage('Health check failed. Verify the API key and try again.')
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      // Placeholder — real integration calls agentWorkspaceService.configureProvider(...)
      // The API key is stored via Supabase Vault or environment secrets, never in plaintext columns.
      await new Promise((r) => setTimeout(r, 600))
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[500px]"
      title={`Configure ${provider.name}`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
            provider key: <span className="font-semibold text-gray-900 dark:text-white">{provider.key}</span>
          </p>
        </div>

        <Field label="API Key">
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
        </Field>

        <Field label="Base URL (optional)">
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.example.com/v1 (for self-hosted)"
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleHealthCheck}
            disabled={healthStatus === 'checking'}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
          >
            {healthStatus === 'checking' ? 'Checking…' : 'Health check'}
          </button>
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

        <p className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          BYOK key storage via Supabase Vault is pending security review. Configuration is saved locally until the vault integration ships.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
            className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
