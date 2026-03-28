import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@lenserfight/features/auth'
import { approveDeviceRequest } from '@lenserfight/data/repositories'
import { supabase } from '@lenserfight/data/supabase'
import { replaceLocationSafely, sanitizeReturnUrl } from '../utils/validateReturnUrl'

async function storeDeviceLoginSession(userCode: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('No active session to store for device login.')
  const { error } = await supabase.rpc('fn_auth_store_device_login_session', {
    p_user_code: userCode,
    p_access_token: session.access_token,
    p_refresh_token: session.refresh_token,
  })
  if (error) throw error
}

export const DeviceApprovalPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const initialCode = searchParams.get('code') ?? ''
  const isLoginMode = searchParams.get('mode') === 'login'
  const [userCode, setUserCode] = useState(initialCode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const returnUrl = useMemo(
    () => sanitizeReturnUrl(searchParams.get('return_url')),
    [searchParams]
  )

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const search = searchParams.toString()
      const next = `/login?return_url=${encodeURIComponent(
        `/device-approval${search ? `?${search}` : ''}`
      )}`
      replaceLocationSafely(next)
    }
  }, [isAuthenticated, isLoading, searchParams])

  useEffect(() => {
    if (initialCode) setUserCode(initialCode)
  }, [initialCode])

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userCode.trim()) {
      setError('Enter the 8-character approval code.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      const result = await approveDeviceRequest({
        userCode: userCode.trim().toUpperCase(),
      })

      if (result.status === 'approved') {
        if (isLoginMode) {
          await storeDeviceLoginSession(userCode.trim().toUpperCase())
          setMessage('Login approved. You can return to the terminal.')
        } else {
          setMessage(
            result.label
              ? `Device approved for ${result.label}. You can return to the CLI.`
              : 'Device approved. You can return to the CLI.'
          )
        }

        if (returnUrl) {
          window.setTimeout(() => {
            replaceLocationSafely(returnUrl)
          }, 1500)
        }
        return
      }

      if (result.status === 'expired') {
        setError('That approval code expired. Ask the CLI to start a new request.')
        return
      }

      if (result.status === 'not_found') {
        setError('Approval code not found.')
        return
      }

      setMessage('Approval request is still pending.')
    } catch (err) {
      setError((err as Error).message || 'Failed to approve device request.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(33,63,116,0.24),_transparent_40%),linear-gradient(180deg,_#f8fafc,_#eef2ff_55%,_#f8fafc)] flex items-center justify-center p-6">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 text-sm text-gray-600 shadow-xl backdrop-blur">
          Loading approval session...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.24),_transparent_30%),linear-gradient(180deg,_#f8fafc,_#ffffff_45%,_#eff6ff)] px-4 py-8 text-gray-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
        <form
          onSubmit={onSubmit}
          className="w-full rounded-[2rem] border border-gray-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-deep-lens-navy-500">
              {isLoginMode ? 'Browser login' : 'Device approval'}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              {isLoginMode ? 'Approve this login' : 'Approve this CLI session'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {isLoginMode
                ? 'A sign-in request was made from the CLI. Confirm below to complete the login.'
                : 'Enter the approval code shown in the CLI. Once you confirm, the CLI can mint a short-lived developer token for automation.'}
            </p>
          </div>

          <label className="mb-3 block text-sm font-medium text-gray-700" htmlFor="device-code">
            Approval code
          </label>
          <input
            id="device-code"
            value={userCode}
            onChange={(event) => setUserCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="text"
            placeholder="ABCD-EFGH"
            className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-lg font-semibold tracking-[0.2em] uppercase text-gray-900 outline-none transition focus:border-deep-lens-navy-500 focus:ring-4 focus:ring-deep-lens-navy-500/10"
          />

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-deep-lens-navy-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-deep-lens-navy-500/20 transition hover:bg-deep-lens-navy-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? 'Approving...'
              : isLoginMode
              ? 'Approve login'
              : 'Approve device'}
          </button>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            This page only approves the request. It never reveals your existing
            Supabase session or password.
          </p>
        </form>
      </div>
    </div>
  )
}

export default DeviceApprovalPage
