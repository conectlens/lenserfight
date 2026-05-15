import { Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { shareService } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { resolveSafeRedirectTarget } from '@lenserfight/utils/dom'

export const ShortLinkRedirect: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const resolve = async () => {
      if (!shortId) return
      try {
        const result = await shareService.resolveAndLog(shortId)
        if (result) {
          const safeTarget = resolveSafeRedirectTarget(result.url, {
            allowedExternalHosts: ((import.meta.env.ALLOWED_EXTERNAL_REDIRECT_HOSTS as string | undefined) ?? '')
              .split(',')
              .map((host: string) => host.trim())
              .filter(Boolean),
          })

          if (!safeTarget) {
            setError('This link points to an unsafe destination.')
            return
          }

          if (safeTarget.kind === 'external') {
            window.location.assign(safeTarget.url)
            return
          }

          navigate(safeTarget.url, { replace: true })
        } else {
          setError('Link not found or expired.')
        }
      } catch (e) {
        console.error(e)
        setError('Failed to resolve link.')
      }
    }
    resolve()
  }, [shortId, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p className="text-gray-600 max-w-md">{error}</p>
        <Button onClick={() => navigate('/')} className="mt-6 w-auto">
          Go Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <p className="text-gray-500 font-medium animate-pulse">Redirecting...</p>
    </div>
  )
}
