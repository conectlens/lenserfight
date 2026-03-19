import React, { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { lenserService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { Button, LoadingOverlay } from '@lenserfight/ui/components'
import { sanitizeReturnUrl, replaceLocationSafely } from '../utils/validateReturnUrl'
import { useAuthProfileGate, AUTH_PROFILE_GATE_QUERY_KEY } from '../hooks/useAuthProfileGate'

export const AccountRecoveryPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()
  const { data: gate, isLoading, error: gateError } = useAuthProfileGate()

  const params = new URLSearchParams(window.location.search)
  const returnUrl = sanitizeReturnUrl(params.get('return_url'))

  const restoreMutation = useMutation({
    mutationFn: async () => lenserService.cancelDeletionOnLogin(),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: AUTH_PROFILE_GATE_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: ['lenser', 'authenticated'] })
      if (result?.restored) {
        replaceLocationSafely(returnUrl)
      } else {
        replaceLocationSafely(
          `/account-unavailable?return_url=${encodeURIComponent(returnUrl)}`
        )
      }
    },
  })
  const { mutate: restoreAccount, status: restoreStatus, isPending: isRestorePending, isError: isRestoreError } =
    restoreMutation

  const deadlineDate = gate?.deletionDeadlineAt ? new Date(gate.deletionDeadlineAt) : null
  const daysRemaining = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  useEffect(() => {
    if (!isAuthenticated || isLoading || !!gateError || !gate) return

    if (gate.kind !== 'recoverable') {
      replaceLocationSafely(
        gate.kind === 'deleted'
          ? `/account-unavailable?return_url=${encodeURIComponent(returnUrl)}`
          : returnUrl
      )
      return
    }

    if (restoreStatus === 'idle') {
      restoreAccount()
    }
  }, [
    gate,
    gateError,
    isAuthenticated,
    isLoading,
    restoreAccount,
    restoreStatus,
    returnUrl,
  ])

  if (!isAuthenticated || isLoading || !!gateError || !gate) {
    return <LoadingOverlay message="Checking your account..." />
  }

  if (gate.kind !== 'recoverable') {
    return <LoadingOverlay message="Redirecting..." />
  }

  if (isRestorePending || restoreStatus === 'idle') {
    return <LoadingOverlay message="Restoring your account..." />
  }

  const title =
    gate.status === 'pending_deletion' ? 'Restore your account' : 'Reactivate your account'
  const body =
    gate.status === 'pending_deletion'
      ? `Your Lenser account is scheduled for deletion.${daysRemaining !== null ? ` You still have ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} to restore it.` : ''}`
      : 'Your Lenser account is currently deactivated. You can reactivate it and continue to the platform.'
  const buttonLabel =
    gate.status === 'pending_deletion' ? 'Restore account' : 'Reactivate account'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 shadow-xl dark:border-amber-800 dark:bg-gray-900">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            !
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">{body}</p>
          <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
            We are restoring your existing Lenser profile automatically. If that fails, you can
            retry below.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button
            className="!w-auto px-4 py-3"
            onClick={() => restoreAccount()}
            isLoading={isRestorePending}
          >
            {buttonLabel}
          </Button>
          <a
            href={returnUrl}
            className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Return to forum
          </a>
        </div>
        {isRestoreError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
            We could not restore the account right now. Please try again.
          </p>
        ) : null}
      </div>
    </div>
  )
}
