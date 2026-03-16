import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@lenserfight/data/supabase'
import { LoadingOverlay } from '@lenserfight/ui/components'
import { sanitizeReturnUrl } from '../utils/validateReturnUrl'

export const OAuthCallbackPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const storedReturnUrl = localStorage.getItem('auth_return_url')
        localStorage.removeItem('auth_return_url')
        const returnUrl = sanitizeReturnUrl(storedReturnUrl)
        window.location.href = returnUrl
      } else {
        navigate('/login')
      }
    })
  }, [navigate])

  return <LoadingOverlay message="Completing sign in..." />
}
