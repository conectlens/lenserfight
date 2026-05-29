import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@lenserfight/features/auth'
import { supabase } from '@lenserfight/data/supabase'
import { Button } from '@lenserfight/ui/components'
import { MCP_SERVER_URL, WEB_BASE_URL } from '@lenserfight/utils/env'


const ALLOWED_MCP_HOSTS = [
  'mcp.lenserfight.com',
  'localhost',
  '127.0.0.1',
]
const ALLOWED_MCP_PATTERNS = [
  /\.ngrok-free\.app$/,
  /\.ngrok-free\.dev$/,
  /\.ngrok\.io$/,
  /\.trycloudflare\.com$/,
]

/**
 * Rewrites WEB_BASE_URL to use the current page's hostname when the two are
 * both local-like (localhost ↔ IP) but differ. This keeps the Supabase session
 * cookie on the same hostname so the web app receives an authenticated session.
 *
 * Example: consent page at localhost:3004, WEB_BASE_URL = http://100.88.58.68:3000
 * → returns http://localhost:3000  (cookie domain stays "localhost")
 */
function getWebBaseUrl(): string {
  try {
    const base = new URL(WEB_BASE_URL)
    const cur = window.location.hostname
    if (cur === base.hostname) return base.origin
    const isLocalLike = (h: string) =>
      h === 'localhost' || h === '127.0.0.1' || /^[\d.]+$/.test(h) || h.includes(':')
    if (isLocalLike(cur) && isLocalLike(base.hostname)) {
      base.hostname = cur
      return base.origin
    }
  } catch { /* ignore */ }
  return WEB_BASE_URL
}

function resolveMcpServerUrl(serverParam: string | null): string {
  if (!serverParam) return MCP_SERVER_URL
  try {
    const u = new URL(serverParam)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return MCP_SERVER_URL
    const host = u.hostname
    if (ALLOWED_MCP_HOSTS.includes(host)) return serverParam
    if (ALLOWED_MCP_PATTERNS.some((re) => re.test(host))) return serverParam
  } catch {
    // invalid URL
  }
  return MCP_SERVER_URL
}

type Phase =
  | { name: 'loading' }
  | { name: 'fetching' }
  | { name: 'consent'; clientName: string }
  | { name: 'authorizing'; clientName: string }
  | { name: 'denied' }
  | { name: 'error'; message: string }

export const McpOAuthConsentPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') ?? ''
  const mcpServerUrl = resolveMcpServerUrl(searchParams.get('server'))
  // auto_allow=1 is set when we redirected the user to onboarding after a 403.
  // On return, we skip re-showing the consent form and complete auth automatically.
  const autoAllow = searchParams.get('auto_allow') === '1'
  const autoAllowFiredRef = useRef(false)
  const [phase, setPhase] = useState<Phase>({ name: 'loading' })

  // Redirect to login if not authenticated, preserving the full current URL as return_url.
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      window.location.replace(`/login?return_url=${encodeURIComponent(window.location.href)}`)
      return
    }
    if (!id) {
      setPhase({ name: 'error', message: 'Missing authorization id.' })
      return
    }
    setPhase({ name: 'fetching' })
    fetch(`${mcpServerUrl}/oauth/client-info?id=${encodeURIComponent(id)}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setPhase({ name: 'error', message: data.error_description ?? data.error })
        else setPhase({ name: 'consent', clientName: data.client_name ?? 'Unknown' })
      })
      .catch((e: Error) => setPhase({ name: 'error', message: e.message }))
  }, [id, isAuthenticated, isLoading, mcpServerUrl, searchParams])

  const handleAllow = async () => {
    if (phase.name !== 'consent') return
    const clientName = phase.clientName
    setPhase({ name: 'authorizing', clientName })
    try {
      // Always refresh the session before authorizing so the JWT is never stale.
      const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
      const session = refreshed?.session ?? null
      if (refreshErr || !session) {
        window.location.replace(`/login?return_url=${encodeURIComponent(window.location.href)}`)
        return
      }
      const res = await fetch(`${mcpServerUrl}/oauth/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, refresh_token: session.refresh_token }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        if (data.error === 'forbidden') {
          if (autoAllow) {
            // Came back from onboarding but profile still not found — break the loop.
            setPhase({ name: 'error', message: data.error_description ?? 'No LenserFight profile found. Please complete your profile setup at lenserfight.com first.' })
            return
          }
          // No lenser profile — send to onboarding. Include auto_allow=1 in the
          // return URL so we skip the consent form and complete auth on return.
          const returnUrl = new URL(window.location.href)
          returnUrl.searchParams.set('auto_allow', '1')
          window.location.href = `${getWebBaseUrl()}/onboarding?return_url=${encodeURIComponent(returnUrl.toString())}`
          return
        }
        setPhase({ name: 'error', message: data.error_description ?? data.error ?? 'Authorization failed.' })
        return
      }
      const redirectUrl = new URL(data.redirect_uri)
      redirectUrl.searchParams.set('code', data.code)
      if (data.state) redirectUrl.searchParams.set('state', data.state)
      window.location.href = redirectUrl.toString()
    } catch (e: unknown) {
      setPhase({ name: 'error', message: e instanceof Error ? e.message : 'Unexpected error.' })
    }
  }

  // When returning from onboarding (auto_allow=1), skip re-showing the consent
  // form and complete auth automatically — the user already gave consent before
  // being sent to onboarding.
  useEffect(() => {
    if (phase.name !== 'consent' || !autoAllow || autoAllowFiredRef.current) return
    autoAllowFiredRef.current = true
    void handleAllow()
  // handleAllow closes over phase/id/mcpServerUrl/autoAllow — all stable within
  // a given render; the ref prevents re-firing on subsequent renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  if (phase.name === 'loading' || phase.name === 'fetching') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(33,63,116,0.24),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 text-sm text-gray-600 shadow-xl backdrop-blur">
          Loading authorization request…
        </div>
      </div>
    )
  }

  if (phase.name === 'denied') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(33,63,116,0.24),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 text-sm text-gray-600 shadow-xl backdrop-blur text-center">
          <p className="font-medium text-gray-800">Authorization cancelled.</p>
          <p className="mt-1 text-gray-500">You can close this window.</p>
        </div>
      </div>
    )
  }

  if (phase.name === 'error') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(33,63,116,0.24),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-red-200 bg-white/90 px-8 py-6 shadow-xl backdrop-blur text-center">
          <p className="font-medium text-gray-900">Something went wrong</p>
          <p className="mt-1 text-sm text-red-600">{phase.message}</p>
        </div>
      </div>
    )
  }

  const clientName = phase.clientName
  const isAuthorizing = phase.name === 'authorizing'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.24),_transparent_30%),linear-gradient(180deg,_#f8fafc,_#ffffff_45%,_#eff6ff)] px-4 py-8 text-gray-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
        <div className="w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-deep-lens-navy-500">
              Authorization request
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              Allow <span className="text-deep-lens-navy-600">{clientName}</span> to access your account?
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              This will grant <strong>{clientName}</strong> access to read and manage your lenses, battles, and workflows on your behalf.
            </p>
          </div>

          <ul className="mb-8 space-y-2 text-sm text-gray-600">
            {['Read and manage your lenses', 'Read and create battles', 'Run and manage your workflows'].map((perm) => (
              <li key={perm} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-deep-lens-navy-500 flex-shrink-0" />
                {perm}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <Button size="lg" fullWidth isLoading={isAuthorizing} onClick={handleAllow}>
              {isAuthorizing ? 'Authorizing…' : `Allow ${clientName}`}
            </Button>
            <Button size="lg" fullWidth variant="ghost" disabled={isAuthorizing} onClick={() => setPhase({ name: 'denied' })}>
              Cancel
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            You can revoke this access at any time from your LenserFight settings.
          </p>
        </div>
      </div>
    </div>
  )
}
