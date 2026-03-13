import { Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useLenser } from '../../../context/LenserContext'
import { shareService } from '../../../services/shareService'

export const ShortLinkRedirect: React.FC = () => {
  const { shortId } = useParams<{ shortId: string }>()
  const navigate = useNavigate()
  const { lenser, isLoading: lenserLoading } = useLenser()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Wait for lenser to load to attribute the view correctly
    if (lenserLoading) return

    const resolve = async () => {
      if (!shortId) return
      try {
        const result = await shareService.resolveAndLog(shortId, lenser?.id)
        if (result) {
          if (result.link.resource_type === 'external') {
            // Force absolute redirect for external links
            window.location.href = result.url
            return
          }

          // Fix: ensure internal navigation uses the correct path (replacing /app with / if needed in data)
          let targetUrl = result.url
          if (targetUrl === '/app') targetUrl = '/'
          if (targetUrl.startsWith('/app/')) targetUrl = targetUrl.replace('/app', '')

          // Internal navigation
          navigate(targetUrl, { replace: true })
        } else {
          setError('Link not found or expired.')
        }
      } catch (e) {
        console.error(e)
        setError('Failed to resolve link.')
      }
    }
    resolve()
  }, [shortId, lenser?.id, lenserLoading, navigate])

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 text-primary-700 font-medium hover:underline"
        >
          Go Home
        </button>
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
