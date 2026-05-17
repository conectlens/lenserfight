/**
 * ConnectorRefField — select a user OAuth connection as a connector ref value.
 *
 * Renders a <select> populated from the active connections in useOAuthConnections.
 * The selected value is the raw ref string (e.g. 'google.sheets.primary').
 *
 * Props:
 *   value        — current ref string or ''
 *   onChange     — called with the new ref string
 *   filterCapability — only show connections for this capability (e.g. 'sheets')
 *   filterProvider   — only show connections for this provider (default: all)
 *   label        — optional field label
 *   required     — shows required indicator
 *   disabled     — disables the select
 *   placeholder  — shown when no value selected
 *   settingsPath — path to settings/connections page (default '/settings/connections')
 */

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'
import type { OAuthCapability, OAuthProvider, UserOAuthConnection } from '@lenserfight/domain/oauth-connections'
import { ChevronDown, Loader2, AlertCircle } from 'lucide-react'

function mapRow(row: Record<string, unknown>): UserOAuthConnection {
  return {
    id: row['id'] as string,
    provider: row['provider'] as OAuthProvider,
    capability: row['capability'] as OAuthCapability,
    connectionLabel: row['connection_label'] as string,
    ref: row['ref'] as string,
    grantedScopes: (row['granted_scopes'] as string[]) ?? [],
    expiresAt: (row['expires_at'] as string | null) ?? null,
    isActive: row['is_active'] as boolean,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }
}

interface ConnectorRefFieldProps {
  value: string
  onChange: (ref: string) => void
  filterCapability?: OAuthCapability
  filterProvider?: OAuthProvider
  label?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  error?: string
  settingsPath?: string
  className?: string
}

export function ConnectorRefField({
  value,
  onChange,
  filterCapability,
  filterProvider,
  label,
  required,
  disabled,
  placeholder = 'Select connection...',
  error,
  settingsPath = '/settings/connections',
  className = '',
}: ConnectorRefFieldProps) {
  const { data: connections = [], isLoading } = useQuery<UserOAuthConnection[]>({
    queryKey: ['oauth-connections'],
    queryFn: async () => {
      const { data, error: rpcError } = await supabase.rpc('fn_oauth_list_connections')
      if (rpcError) throw rpcError
      return ((data as Record<string, unknown>[] | null) ?? []).map(mapRow)
    },
    staleTime: 1000 * 60 * 2,
  })

  const filtered = connections.filter((c) => {
    if (!c.isActive) return false
    if (filterCapability && c.capability !== filterCapability) return false
    if (filterProvider && c.provider !== filterProvider) return false
    return true
  })

  const isEmpty = filtered.length === 0

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading || isEmpty}
          className={`
            w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-sm bg-white dark:bg-gray-800 text-left transition-all
            ${error
              ? 'border-red-500 focus:ring-red-200'
              : 'border-gray-200 dark:border-gray-700 focus:ring-primary/50 focus:border-primary'
            }
            ${disabled || isEmpty ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-900' : 'cursor-pointer focus:ring-2'}
            text-gray-900 dark:text-gray-100
          `}
        >
          <option value="" disabled>
            {isLoading ? 'Loading connections…' : isEmpty ? 'No connections — add one in Settings' : placeholder}
          </option>
          {filtered.map((c) => (
            <option key={c.id} value={c.ref}>
              {c.connectionLabel} ({c.ref})
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-gray-400" />
          ) : (
            <ChevronDown size={14} className="text-gray-400" />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500 font-medium">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {isEmpty && !isLoading && (
        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
          <a
            href={settingsPath}
            className="text-primary hover:underline"
          >
            Manage connections
          </a>{' '}
          to link a Google account.
        </p>
      )}
    </div>
  )
}
